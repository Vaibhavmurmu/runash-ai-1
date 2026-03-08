import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"
import { getSmsOtpProvider, type SmsDeliveryResult } from "@/lib/sms-provider-client"

const phoneRegex = /^\+[1-9]\d{1,14}$/
const OTP_LENGTH = 6
const OTP_TTL_SECONDS = 5 * 60
const CHALLENGE_TTL_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 60
const MAX_VERIFY_ATTEMPTS = 5

type OtpPurpose = "login" | "registration"

interface StartPayload {
  phoneNumber: string
  purpose: OtpPurpose
  captchaToken?: string
}

interface VerifyPayload {
  phoneNumber: string
  purpose: OtpPurpose
  code: string
}

function normalizeIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown"
}

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex")
}

function buildOtpHash(phoneNumber: string, purpose: string, otpCode: string) {
  const secret = process.env.PHONE_OTP_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "runash-phone-otp"
  return createHash("sha256").update(`${phoneNumber}:${purpose}:${otpCode}:${secret}`).digest("hex")
}

async function ensurePhoneOtpTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS phone_otp_challenges (
      id BIGSERIAL PRIMARY KEY,
      phone_number TEXT NOT NULL,
      purpose TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      otp_last4 TEXT NOT NULL,
      request_ip TEXT,
      user_agent TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT ${MAX_VERIFY_ATTEMPTS},
      resend_count INTEGER NOT NULL DEFAULT 0,
      resend_available_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_phone_otp_challenges_phone_purpose
    ON phone_otp_challenges(phone_number, purpose, created_at DESC)
  `

  await sql`
    CREATE TABLE IF NOT EXISTS phone_verifications (
      id BIGSERIAL PRIMARY KEY,
      phone_number TEXT NOT NULL,
      purpose TEXT NOT NULL,
      challenge_id BIGINT REFERENCES phone_otp_challenges(id) ON DELETE SET NULL,
      verified_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (phone_number, purpose)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS phone_otp_throttles (
      id BIGSERIAL PRIMARY KEY,
      scope TEXT NOT NULL,
      identifier TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (scope, identifier)
    )
  `
}

async function checkThrottle(scope: "ip" | "identifier", identifier: string, maxHits: number, windowSeconds: number) {
  const windowStart = new Date(Date.now() - windowSeconds * 1000)
  const blockedForMinutes = 15

  const rows = await sql`
    INSERT INTO phone_otp_throttles(scope, identifier, hits, window_started_at, blocked_until, updated_at)
    VALUES (${scope}, ${identifier}, 1, NOW(), NULL, NOW())
    ON CONFLICT (scope, identifier)
    DO UPDATE SET
      hits = CASE WHEN phone_otp_throttles.window_started_at < ${windowStart} THEN 1 ELSE phone_otp_throttles.hits + 1 END,
      window_started_at = CASE WHEN phone_otp_throttles.window_started_at < ${windowStart} THEN NOW() ELSE phone_otp_throttles.window_started_at END,
      blocked_until = CASE
        WHEN phone_otp_throttles.window_started_at >= ${windowStart} AND phone_otp_throttles.hits + 1 > ${maxHits}
          THEN NOW() + (${blockedForMinutes} * INTERVAL '1 minute')
        ELSE phone_otp_throttles.blocked_until
      END,
      updated_at = NOW()
    RETURNING hits, blocked_until
  `

  const throttle = rows[0] as { hits: number; blocked_until: Date | null }
  if (throttle?.blocked_until && new Date(throttle.blocked_until) > new Date()) {
    return { allowed: false, blockedUntil: new Date(throttle.blocked_until) }
  }

  return { allowed: throttle.hits <= maxHits, blockedUntil: undefined }
}

async function verifyCaptchaHook(payload: { token?: string; phoneNumber: string; ipAddress: string }) {
  const hookUrl = process.env.PHONE_OTP_CAPTCHA_HOOK_URL
  if (!hookUrl) {
    return { valid: true }
  }

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: payload.token,
        ipAddress: payload.ipAddress,
        identifierHash: hashIdentifier(payload.phoneNumber),
      }),
    })

    if (!response.ok) {
      return { valid: false }
    }

    const data = (await response.json()) as { valid?: boolean }
    return { valid: Boolean(data.valid) }
  } catch {
    return { valid: false }
  }
}

async function dispatchSmsOtp(phoneNumber: string, code: string, purpose: OtpPurpose): Promise<SmsDeliveryResult> {
  const provider = getSmsOtpProvider()
  return provider.sendOtp({
    phoneNumber,
    code,
    purpose,
    requestId: randomUUID(),
  })
}

async function createOrRotateChallenge(input: { phoneNumber: string; purpose: OtpPurpose; ipAddress: string; userAgent: string }) {
  const otpCode = `${randomInt(0, 10 ** OTP_LENGTH)}`.padStart(OTP_LENGTH, "0")
  const otpHash = buildOtpHash(input.phoneNumber, input.purpose, otpCode)
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000)
  const resendAvailableAt = new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)

  const existing = await sql`
    SELECT id FROM phone_otp_challenges
    WHERE phone_number = ${input.phoneNumber}
      AND purpose = ${input.purpose}
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `

  let challengeId: number
  if (existing.length > 0) {
    const [updated] = await sql`
      UPDATE phone_otp_challenges
      SET otp_hash = ${otpHash},
          otp_last4 = ${otpCode.slice(-4)},
          resend_count = resend_count + 1,
          resend_available_at = ${resendAvailableAt},
          expires_at = ${expiresAt},
          attempts = 0,
          request_ip = ${input.ipAddress},
          user_agent = ${input.userAgent},
          updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING id
    `
    challengeId = updated.id
  } else {
    const [created] = await sql`
      INSERT INTO phone_otp_challenges (
        phone_number,
        purpose,
        otp_hash,
        otp_last4,
        request_ip,
        user_agent,
        resend_available_at,
        expires_at
      ) VALUES (
        ${input.phoneNumber},
        ${input.purpose},
        ${otpHash},
        ${otpCode.slice(-4)},
        ${input.ipAddress},
        ${input.userAgent},
        ${resendAvailableAt},
        ${expiresAt}
      )
      RETURNING id
    `
    challengeId = created.id
  }

  return { challengeId, otpCode, resendAvailableAt }
}

async function writeAuditEvent(
  request: NextRequest,
  event: "auth.login.attempt" | "auth.login.success" | "auth.login.failed",
  details: Record<string, unknown>,
) {
  await recordSecurityAuditEvent({
    event,
    request,
    resource: "auth.phone-otp",
    details,
  })
}

export async function startPhoneOtp(request: NextRequest) {
  await ensurePhoneOtpTables()
  const body = (await request.json()) as StartPayload

  if (!phoneRegex.test(body.phoneNumber) || (body.purpose !== "login" && body.purpose !== "registration")) {
    return NextResponse.json({ success: false, message: "Invalid request payload" }, { status: 400 })
  }

  const ipAddress = normalizeIp(request)
  const userAgent = request.headers.get("user-agent") ?? "unknown"

  const [ipThrottle, identifierThrottle] = await Promise.all([
    checkThrottle("ip", ipAddress, 10, 10 * 60),
    checkThrottle("identifier", hashIdentifier(body.phoneNumber), 5, 10 * 60),
  ])

  if (!ipThrottle.allowed || !identifierThrottle.allowed) {
    await writeAuditEvent(request, "auth.login.failed", {
      reason: "phone_otp_rate_limited",
      ipThrottle: !ipThrottle.allowed,
      identifierThrottle: !identifierThrottle.allowed,
      identifierHash: hashIdentifier(body.phoneNumber),
    })
    return NextResponse.json({ success: false, message: "Too many attempts. Please try later." }, { status: 429 })
  }

  const captchaResult = await verifyCaptchaHook({ token: body.captchaToken, phoneNumber: body.phoneNumber, ipAddress })
  if (!captchaResult.valid) {
    await writeAuditEvent(request, "auth.login.failed", {
      reason: "phone_otp_captcha_failed",
      identifierHash: hashIdentifier(body.phoneNumber),
    })
    return NextResponse.json({ success: false, message: "Captcha verification failed" }, { status: 403 })
  }

  const [activeChallenge] = await sql`
    SELECT id, resend_available_at
    FROM phone_otp_challenges
    WHERE phone_number = ${body.phoneNumber}
      AND purpose = ${body.purpose}
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  ` as Array<{ id: number; resend_available_at: Date }>

  if (activeChallenge && new Date(activeChallenge.resend_available_at).getTime() > Date.now()) {
    const cooldownSeconds = Math.ceil((new Date(activeChallenge.resend_available_at).getTime() - Date.now()) / 1000)
    return NextResponse.json(
      { success: false, message: "OTP cooldown active", cooldownSeconds, challengeId: activeChallenge.id },
      { status: 429 },
    )
  }

  const challenge = await createOrRotateChallenge({
    phoneNumber: body.phoneNumber,
    purpose: body.purpose,
    ipAddress,
    userAgent,
  })

  const delivery = await dispatchSmsOtp(body.phoneNumber, challenge.otpCode, body.purpose)
  if (!delivery.success) {
    await writeAuditEvent(request, "auth.login.failed", {
      reason: "phone_otp_delivery_failed",
      challengeId: challenge.challengeId,
      provider: delivery.provider,
      deliveryState: delivery.state,
      retryCount: delivery.retryCount ?? 0,
      errorCode: delivery.errorCode ?? "unknown",
      identifierHash: hashIdentifier(body.phoneNumber),
    })
    return NextResponse.json({ success: false, message: "Failed to send OTP" }, { status: 502 })
  }

  await writeAuditEvent(request, "auth.login.attempt", {
    event: "phone_otp_started",
    purpose: body.purpose,
    challengeId: challenge.challengeId,
    identifierHash: hashIdentifier(body.phoneNumber),
    provider: delivery.provider,
    deliveryState: delivery.state,
    providerMessageId: delivery.providerMessageId ?? null,
    providerRequestId: delivery.providerRequestId ?? null,
  })

  return NextResponse.json({
    success: true,
    message: "OTP sent",
    challengeId: challenge.challengeId,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    expiresInSeconds: OTP_TTL_SECONDS,
  })
}

export async function verifyPhoneOtp(request: NextRequest) {
  await ensurePhoneOtpTables()
  const body = (await request.json()) as VerifyPayload

  if (!phoneRegex.test(body.phoneNumber) || (body.purpose !== "login" && body.purpose !== "registration") || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ success: false, message: "Invalid request payload" }, { status: 400 })
  }

  const [challenge] = await sql`
    SELECT id, otp_hash, attempts, max_attempts, expires_at
    FROM phone_otp_challenges
    WHERE phone_number = ${body.phoneNumber}
      AND purpose = ${body.purpose}
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  ` as Array<{ id: number; otp_hash: string; attempts: number; max_attempts: number; expires_at: Date }>

  if (!challenge) {
    return NextResponse.json({ success: false, message: "No active challenge found" }, { status: 404 })
  }

  if (challenge.attempts >= challenge.max_attempts) {
    await sql`UPDATE phone_otp_challenges SET status = 'locked', updated_at = NOW() WHERE id = ${challenge.id}`
    return NextResponse.json({ success: false, message: "Challenge is locked" }, { status: 429 })
  }

  const expectedHash = buildOtpHash(body.phoneNumber, body.purpose, body.code)
  const match = timingSafeEqual(Buffer.from(expectedHash), Buffer.from(challenge.otp_hash))

  if (!match) {
    await sql`
      UPDATE phone_otp_challenges
      SET attempts = attempts + 1,
          updated_at = NOW(),
          status = CASE WHEN attempts + 1 >= max_attempts THEN 'locked' ELSE status END
      WHERE id = ${challenge.id}
    `

    await writeAuditEvent(request, "auth.login.failed", {
      reason: "phone_otp_invalid_code",
      challengeId: challenge.id,
      identifierHash: hashIdentifier(body.phoneNumber),
    })

    return NextResponse.json({ success: false, message: "Invalid OTP code" }, { status: 400 })
  }

  await sql`
    UPDATE phone_otp_challenges
    SET status = 'verified',
        verified_at = NOW(),
        updated_at = NOW()
    WHERE id = ${challenge.id}
  `

  await sql`
    INSERT INTO phone_verifications(phone_number, purpose, challenge_id, verified_at, expires_at)
    VALUES (${body.phoneNumber}, ${body.purpose}, ${challenge.id}, NOW(), NOW() + INTERVAL '30 days')
    ON CONFLICT (phone_number, purpose)
    DO UPDATE SET
      challenge_id = EXCLUDED.challenge_id,
      verified_at = EXCLUDED.verified_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `

  await writeAuditEvent(request, "auth.login.success", {
    event: "phone_otp_verified",
    challengeId: challenge.id,
    purpose: body.purpose,
    identifierHash: hashIdentifier(body.phoneNumber),
  })

  return NextResponse.json({ success: true, verified: true, message: "Phone verified" })
}

export async function resendPhoneOtp(request: NextRequest) {
  await ensurePhoneOtpTables()
  const body = (await request.json()) as StartPayload

  if (!phoneRegex.test(body.phoneNumber) || (body.purpose !== "login" && body.purpose !== "registration")) {
    return NextResponse.json({ success: false, message: "Invalid request payload" }, { status: 400 })
  }

  const [challenge] = await sql`
    SELECT id, resend_available_at
    FROM phone_otp_challenges
    WHERE phone_number = ${body.phoneNumber}
      AND purpose = ${body.purpose}
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  ` as Array<{ id: number; resend_available_at: Date }>

  if (!challenge) {
    return NextResponse.json({ success: false, message: "No challenge found. Start again." }, { status: 404 })
  }

  const cooldownMs = new Date(challenge.resend_available_at).getTime() - Date.now()
  if (cooldownMs > 0) {
    return NextResponse.json({ success: false, message: "Cooldown active", cooldownSeconds: Math.ceil(cooldownMs / 1000) }, { status: 429 })
  }

  const ipAddress = normalizeIp(request)
  const userAgent = request.headers.get("user-agent") ?? "unknown"
  const rotated = await createOrRotateChallenge({ phoneNumber: body.phoneNumber, purpose: body.purpose, ipAddress, userAgent })
  const delivery = await dispatchSmsOtp(body.phoneNumber, rotated.otpCode, body.purpose)

  if (!delivery.success) {
    await writeAuditEvent(request, "auth.login.failed", {
      reason: "phone_otp_resend_delivery_failed",
      challengeId: rotated.challengeId,
      provider: delivery.provider,
      deliveryState: delivery.state,
      retryCount: delivery.retryCount ?? 0,
      errorCode: delivery.errorCode ?? "unknown",
      identifierHash: hashIdentifier(body.phoneNumber),
    })
    return NextResponse.json({ success: false, message: "Failed to resend OTP" }, { status: 502 })
  }

  await writeAuditEvent(request, "auth.login.attempt", {
    event: "phone_otp_resent",
    challengeId: rotated.challengeId,
    purpose: body.purpose,
    identifierHash: hashIdentifier(body.phoneNumber),
    provider: delivery.provider,
    deliveryState: delivery.state,
    providerMessageId: delivery.providerMessageId ?? null,
    providerRequestId: delivery.providerRequestId ?? null,
  })

  return NextResponse.json({ success: true, message: "OTP resent", cooldownSeconds: RESEND_COOLDOWN_SECONDS, challengeId: rotated.challengeId })
}
