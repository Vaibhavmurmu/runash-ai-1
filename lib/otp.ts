import { createHash, randomInt, randomUUID } from "crypto"
import { logApiEvent } from "./api/logging"
import { assertDatabaseConfigured, sql } from "./db"
import { sendOtpCodeEmail } from "./email"

function ensureOtpDbConfigured() {
  assertDatabaseConfigured("lib/otp.ts")
}

type OtpLogLevel = "info" | "warn" | "error"

type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, any>>>

type SmsDeliveryState = "sent" | "queued" | "failed"

type SmsDeliveryResult = {
  success: boolean
  state: SmsDeliveryState
  provider: string
  providerMessageId?: string
  providerRequestId?: string
  retryCount?: number
  errorCode?: string
}

type SmsOtpProviderSendInput = {
  phoneNumber: string
  code: string
  purpose: string
  requestId: string
}

type SmsOtpProvider = {
  name: string
  sendOtp: (input: SmsOtpProviderSendInput) => Promise<SmsDeliveryResult>
}

type TwilioHttpResponse = {
  ok: boolean
  status: number
  json: () => Promise<Record<string, unknown>>
  text: () => Promise<string>
  headers?: { get: (name: string) => string | null }
}

type TwilioHttpClient = (input: RequestInfo | URL, init?: RequestInit) => Promise<TwilioHttpResponse>


function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex").slice(0, 16)
}

function logOtpEvent(
  level: OtpLogLevel,
  event: string,
  requestId: string,
  details: Record<string, unknown>,
  error?: unknown,
) {
  logApiEvent(level, event, {
    requestId,
    route: "internal/otp",
    method: "INTERNAL",
    details,
    error,
  })
}

export interface OTPCode {
  id: number
  user_id?: number
  email?: string
  phone_number?: string
  code: string
  type: string
  purpose: string
  attempts: number
  max_attempts: number
  expires_at: Date
  used_at?: Date
  created_at: Date
  ip_address?: string
  user_agent?: string
  is_active: boolean
}

export interface OTPRateLimit {
  identifier: string
  type: string
  attempts: number
  blocked_until?: Date
}

// Generate a secure OTP code
export function generateOTPCode(length = 6): string {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += randomInt(0, 10).toString()
  }
  return code
}

// Check rate limiting for OTP requests
export async function checkOTPRateLimit(
  identifier: string,
  type: "email" | "sms" | "ip",
  maxAttempts = 5,
  windowMinutes = 15,
): Promise<{ allowed: boolean; attemptsLeft: number; blockedUntil?: Date }> {
  try {
    ensureOtpDbConfigured()
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

    // Get or create rate limit record
    const rateLimitResult = await sql`
      INSERT INTO otp_rate_limits (identifier, type, attempts, window_start)
      VALUES (${identifier}, ${type}, 1, NOW())
      ON CONFLICT (identifier, type) 
      DO UPDATE SET 
        attempts = CASE 
          WHEN otp_rate_limits.window_start < ${windowStart} THEN 1
          ELSE otp_rate_limits.attempts + 1
        END,
        window_start = CASE 
          WHEN otp_rate_limits.window_start < ${windowStart} THEN NOW()
          ELSE otp_rate_limits.window_start
        END,
        blocked_until = CASE 
          WHEN otp_rate_limits.attempts + 1 > ${maxAttempts} THEN NOW() + INTERVAL '1 hour'
          ELSE otp_rate_limits.blocked_until
        END,
        updated_at = NOW()
      RETURNING *
    `

    const rateLimit = rateLimitResult[0]

    if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > new Date()) {
      return {
        allowed: false,
        attemptsLeft: 0,
        blockedUntil: new Date(rateLimit.blocked_until),
      }
    }

    const attemptsLeft = Math.max(0, maxAttempts - rateLimit.attempts)
    return {
      allowed: rateLimit.attempts <= maxAttempts,
      attemptsLeft,
    }
  } catch (error) {
    logOtpEvent("error", "otp.rate_limit.check_failed", randomUUID(), { outcome: "error", type }, error)
    return { allowed: false, attemptsLeft: 0 }
  }
}

// Create and send email OTP
export async function createEmailOTP(
  email: string,
  purpose: string,
  userId?: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  return createEmailOTPWithClient(sql, email, purpose, {
    userId,
    ipAddress,
    userAgent,
    deliverEmailOtp: sendEmailOTP,
  })
}

export async function createEmailOTPWithClient(
  sqlClient: SqlClient,
  email: string,
  purpose: string,
  options: {
    userId?: number
    ipAddress?: string
    userAgent?: string
    deliverEmailOtp?: (email: string, code: string, purpose: string) => Promise<boolean>
    checkRateLimit?: typeof checkOTPRateLimit
  } = {},
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const requestId = randomUUID()
  const deliverEmailOtp = options.deliverEmailOtp ?? sendEmailOTP
  const checkRateLimit = options.checkRateLimit ?? checkOTPRateLimit
  try {
    logOtpEvent("info", "otp.email.create.attempt", requestId, {
      outcome: "attempted",
      identifierHash: hashIdentifier(email),
      purpose,
      vendor: "email",
    })

    // Check rate limiting
    const rateLimit = await checkRateLimit(email, "email")
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.blockedUntil
          ? `Too many attempts. Try again after ${rateLimit.blockedUntil.toLocaleTimeString()}`
          : "Too many attempts. Please try again later.",
      }
    }

    // Deactivate existing OTP codes for this email and purpose
    await sqlClient`
      UPDATE otp_codes 
      SET is_active = false 
      WHERE email = ${email} AND purpose = ${purpose} AND is_active = true
    `

    // Generate new OTP code
    const code = generateOTPCode(6)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP code
    await sqlClient`
      INSERT INTO otp_codes (user_id, email, code, type, purpose, expires_at, ip_address, user_agent)
      VALUES (${options.userId || null}, ${email}, ${code}, 'email', ${purpose}, ${expiresAt}, ${options.ipAddress || null}, ${options.userAgent || null})
    `

    // Send email
    const emailSent = await deliverEmailOtp(email, code, purpose)

    if (!emailSent) {
      return { success: false, message: "Failed to send OTP email" }
    }

    logOtpEvent("info", "otp.email.create.success", requestId, {
      outcome: "sent",
      identifierHash: hashIdentifier(email),
      purpose,
      vendor: "email",
    })

    return {
      success: true,
      message: "OTP sent to your email",
      expiresIn: 10 * 60, // 10 minutes in seconds
    }
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.email.create_failed",
      requestId,
      { outcome: "error", identifierHash: hashIdentifier(email), purpose, vendor: "email" },
      error,
    )
    return { success: false, message: "Failed to create OTP" }
  }
}

// Create and send SMS OTP
export async function createSMSOTP(
  phoneNumber: string,
  purpose: string,
  userId?: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  return createSMSOTPWithClient(sql, phoneNumber, purpose, {
    userId,
    ipAddress,
    userAgent,
    deliverSmsOtp: sendSMSOTP,
  })
}

export async function createSMSOTPWithClient(
  sqlClient: SqlClient,
  phoneNumber: string,
  purpose: string,
  options: {
    userId?: number
    ipAddress?: string
    userAgent?: string
    deliverSmsOtp?: (phoneNumber: string, code: string, purpose: string) => Promise<boolean | SmsDeliveryResult>
    checkRateLimit?: typeof checkOTPRateLimit
  } = {},
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const requestId = randomUUID()
  const deliverSmsOtp = options.deliverSmsOtp ?? sendSMSOTP
  const checkRateLimit = options.checkRateLimit ?? checkOTPRateLimit
  try {
    logOtpEvent("info", "otp.sms.create.attempt", requestId, {
      outcome: "attempted",
      identifierHash: hashIdentifier(phoneNumber),
      purpose,
      vendor: getSmsOtpProvider().name,
    })

    // Check rate limiting
    const rateLimit = await checkRateLimit(phoneNumber, "sms")
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.blockedUntil
          ? `Too many attempts. Try again after ${rateLimit.blockedUntil.toLocaleTimeString()}`
          : "Too many attempts. Please try again later.",
      }
    }

    // Deactivate existing OTP codes for this phone and purpose
    await sqlClient`
      UPDATE otp_codes 
      SET is_active = false 
      WHERE phone_number = ${phoneNumber} AND purpose = ${purpose} AND is_active = true
    `

    // Generate new OTP code
    const code = generateOTPCode(6)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes (shorter for SMS)

    // Store OTP code
    await sqlClient`
      INSERT INTO otp_codes (user_id, phone_number, code, type, purpose, expires_at, ip_address, user_agent)
      VALUES (${options.userId || null}, ${phoneNumber}, ${code}, 'sms', ${purpose}, ${expiresAt}, ${options.ipAddress || null}, ${options.userAgent || null})
    `

    // Send SMS
    const delivery = normalizeSmsDeliveryResult(await deliverSmsOtp(phoneNumber, code, purpose))

    if (!delivery.success) {
      logOtpEvent("error", "otp.sms.create.failed", requestId, {
        outcome: "failed",
        identifierHash: hashIdentifier(phoneNumber),
        purpose,
        vendor: delivery.provider,
        providerState: delivery.state,
        providerMessageId: delivery.providerMessageId,
        providerRequestId: delivery.providerRequestId,
        retryCount: delivery.retryCount,
        errorCode: delivery.errorCode,
      })
      return { success: false, message: "Failed to send SMS OTP" }
    }

    logOtpEvent("info", "otp.sms.create.success", requestId, {
      outcome: delivery.state,
      identifierHash: hashIdentifier(phoneNumber),
      purpose,
      vendor: delivery.provider,
      providerState: delivery.state,
      providerMessageId: delivery.providerMessageId,
      providerRequestId: delivery.providerRequestId,
      retryCount: delivery.retryCount,
    })

    return {
      success: true,
      message: "OTP sent to your phone",
      expiresIn: 5 * 60, // 5 minutes in seconds
    }
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.sms.create_failed",
      requestId,
      {
        outcome: "failed",
        identifierHash: hashIdentifier(phoneNumber),
        purpose,
        vendor: getSmsOtpProvider().name,
        providerState: "failed",
      },
      error,
    )
    return { success: false, message: "Failed to create OTP" }
  }
}

// Verify OTP code
export async function verifyOTP(
  code: string,
  identifier: string, // email or phone number
  purpose: string,
  type: "email" | "sms",
): Promise<{ success: boolean; message: string; userId?: number }> {
  return verifyOTPWithClient(sql, code, identifier, purpose, type)
}

export async function verifyOTPWithClient(
  sqlClient: SqlClient,
  code: string,
  identifier: string, // email or phone number
  purpose: string,
  type: "email" | "sms",
): Promise<{ success: boolean; message: string; userId?: number }> {
  const requestId = randomUUID()
  try {
    ensureOtpDbConfigured()
    const otpResult = await (type === "email"
      ? sqlClient`
          SELECT * FROM otp_codes 
          WHERE email = ${identifier} 
            AND code = ${code} 
            AND purpose = ${purpose} 
            AND type = ${type}
            AND is_active = true 
            AND expires_at > NOW()
            AND used_at IS NULL
          ORDER BY created_at DESC 
          LIMIT 1
        `
      : sqlClient`
          SELECT * FROM otp_codes 
          WHERE phone_number = ${identifier} 
            AND code = ${code} 
            AND purpose = ${purpose} 
            AND type = ${type}
            AND is_active = true 
            AND expires_at > NOW()
            AND used_at IS NULL
          ORDER BY created_at DESC 
          LIMIT 1
        `)

    logOtpEvent("info", "otp.verify.attempt", requestId, {
      outcome: otpResult.length > 0 ? "candidate_found" : "candidate_missing",
      type,
      purpose,
      identifierHash: hashIdentifier(identifier),
    })

    if (otpResult.length === 0) {
      return { success: false, message: "Invalid or expired OTP code" }
    }

    const otpRecord = otpResult[0]

    // Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return { success: false, message: "Too many failed attempts. Please request a new OTP." }
    }

    // Increment attempts
    await sqlClient`
      UPDATE otp_codes 
      SET attempts = attempts + 1 
      WHERE id = ${otpRecord.id}
    `

    // Mark as used
    await sqlClient`
      UPDATE otp_codes 
      SET used_at = NOW(), is_active = false 
      WHERE id = ${otpRecord.id}
    `

    // Clean up other active OTP codes for this identifier and purpose
    if (type === "email") {
      await sqlClient`
        UPDATE otp_codes 
        SET is_active = false 
        WHERE email = ${identifier} 
          AND purpose = ${purpose} 
          AND id != ${otpRecord.id}
      `
    } else {
      await sqlClient`
        UPDATE otp_codes 
        SET is_active = false 
        WHERE phone_number = ${identifier} 
          AND purpose = ${purpose} 
          AND id != ${otpRecord.id}
      `
    }

    const verifyResult = {
      success: true,
      message: "OTP verified successfully",
      userId: otpRecord.user_id,
    }

    logOtpEvent("info", "otp.verify.success", requestId, {
      outcome: "verified",
      type,
      purpose,
      identifierHash: hashIdentifier(identifier),
    })

    return verifyResult
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.verify.failed",
      requestId,
      { outcome: "error", type, purpose, identifierHash: hashIdentifier(identifier) },
      error,
    )
    return { success: false, message: "Failed to verify OTP" }
  }
}

// Send email OTP
async function sendEmailOTP(email: string, code: string, purpose: string): Promise<boolean> {
  const requestId = randomUUID()
  try {
    await sendOtpCodeEmail({
      to: email,
      code,
      purpose,
    })
    return true
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.email.email_provider.send_failed",
      requestId,
      { outcome: "error", identifierHash: hashIdentifier(email), purpose, vendor: "email" },
      error,
    )
    return false
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function normalizeSmsDeliveryResult(result: boolean | SmsDeliveryResult): SmsDeliveryResult {
  if (typeof result === "boolean") {
    return {
      success: result,
      state: result ? "sent" : "failed",
      provider: "legacy",
    }
  }
  return result
}

function buildTwilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
}

function parseTwilioState(status: string | undefined): SmsDeliveryState {
  if (!status) {
    return "queued"
  }

  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === "sent" || normalizedStatus === "delivered") {
    return "sent"
  }

  if (["queued", "accepted", "scheduled", "sending"].includes(normalizedStatus)) {
    return "queued"
  }

  return "failed"
}

export function createTwilioSmsProvider(httpClient: TwilioHttpClient = fetch): SmsOtpProvider {
  return {
    name: "twilio",
    async sendOtp({ phoneNumber, code, purpose, requestId }: SmsOtpProviderSendInput): Promise<SmsDeliveryResult> {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const fromNumber = process.env.TWILIO_PHONE_NUMBER

      if (!accountSid || !authToken || !fromNumber) {
        return {
          success: false,
          state: "failed",
          provider: "twilio",
          providerRequestId: requestId,
          errorCode: "twilio_config_missing",
        }
      }

      const maxAttempts = Number(process.env.OTP_SMS_PROVIDER_MAX_RETRIES ?? "3")
      const backoffBaseMs = Number(process.env.OTP_SMS_PROVIDER_BACKOFF_BASE_MS ?? "250")

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const body = new URLSearchParams({
            To: phoneNumber,
            From: fromNumber,
            Body: `Your RunAsh OTP for ${purpose} is ${code}. It expires in 5 minutes.`,
          })
          const response = await httpClient(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: buildTwilioAuthHeader(accountSid, authToken),
                "Content-Type": "application/x-www-form-urlencoded",
                "X-RunAsh-Request-Id": requestId,
              },
              body: body.toString(),
            },
          )

          const providerRequestId = response.headers?.get("x-request-id") ?? requestId

          if (!response.ok) {
            const errorPayload = await response.text()
            const retryable = response.status === 429 || response.status >= 500
            if (retryable && attempt < maxAttempts) {
              await sleep(backoffBaseMs * 2 ** (attempt - 1))
              continue
            }

            return {
              success: false,
              state: "failed",
              provider: "twilio",
              providerRequestId,
              retryCount: attempt - 1,
              errorCode: `twilio_http_${response.status}_${errorPayload.slice(0, 48)}`,
            }
          }

          const payload = await response.json()
          const state = parseTwilioState(typeof payload.status === "string" ? payload.status : undefined)
          return {
            success: state !== "failed",
            state,
            provider: "twilio",
            providerMessageId: typeof payload.sid === "string" ? payload.sid : undefined,
            providerRequestId,
            retryCount: attempt - 1,
            errorCode: typeof payload.error_code === "string" ? payload.error_code : undefined,
          }
        } catch (error) {
          if (attempt < maxAttempts) {
            await sleep(backoffBaseMs * 2 ** (attempt - 1))
            continue
          }

          return {
            success: false,
            state: "failed",
            provider: "twilio",
            providerRequestId: requestId,
            retryCount: attempt - 1,
            errorCode: error instanceof Error ? error.name : "twilio_network_error",
          }
        }
      }

      return {
        success: false,
        state: "failed",
        provider: "twilio",
        providerRequestId: requestId,
        errorCode: "twilio_retry_exhausted",
      }
    },
  }
}

function createNoopSmsProvider(): SmsOtpProvider {
  return {
    name: "noop",
    async sendOtp({ requestId }: SmsOtpProviderSendInput): Promise<SmsDeliveryResult> {
      return {
        success: false,
        state: "failed",
        provider: "noop",
        providerRequestId: requestId,
        errorCode: "sms_provider_not_configured",
      }
    },
  }
}

function getSmsOtpProvider(): SmsOtpProvider {
  const provider = process.env.OTP_SMS_PROVIDER?.toLowerCase() ?? "twilio"
  if (provider === "twilio") {
    return createTwilioSmsProvider()
  }

  return createNoopSmsProvider()
}

async function sendSMSOTP(phoneNumber: string, code: string, purpose: string): Promise<SmsDeliveryResult> {
  const requestId = randomUUID()
  const smsProvider = getSmsOtpProvider()

  logOtpEvent("info", "otp.sms.provider.send_attempt", requestId, {
    vendor: smsProvider.name,
    purpose,
    identifierHash: hashIdentifier(phoneNumber),
    outcome: "attempted",
  })

  const delivery = await smsProvider.sendOtp({
    phoneNumber,
    code,
    purpose,
    requestId,
  })

  logOtpEvent(delivery.success ? "info" : "error", "otp.sms.provider.send_result", requestId, {
    vendor: delivery.provider,
    purpose,
    identifierHash: hashIdentifier(phoneNumber),
    outcome: delivery.state,
    providerMessageId: delivery.providerMessageId,
    providerRequestId: delivery.providerRequestId,
    retryCount: delivery.retryCount,
    errorCode: delivery.errorCode,
  })

  return delivery
}
