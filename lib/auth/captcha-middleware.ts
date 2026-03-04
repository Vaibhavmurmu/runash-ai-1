import { createHash } from "node:crypto"
import { type NextRequest, NextResponse } from "next/server"
import { recordAuthMetric } from "@/lib/auth-observability"

interface CaptchaPayload {
  token?: string
  endpoint: string
  action: string
  identifierHash?: string
  ipAddress: string
  userAgent: string
}

function normalizeIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown"
}

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex")
}

async function verifyCaptchaHook(payload: CaptchaPayload) {
  const hookUrl = process.env.AUTH_CAPTCHA_HOOK_URL
  if (!hookUrl) {
    return { valid: true }
  }

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

export async function applyAuthCaptchaMiddleware(
  request: NextRequest,
  options: {
    endpoint: string
    action: string
    body: Record<string, unknown>
    identifier?: string
  },
): Promise<NextResponse | null> {
  const token =
    (typeof options.body.captchaToken === "string" && options.body.captchaToken) || request.headers.get("x-captcha-token") || undefined

  const result = await verifyCaptchaHook({
    token,
    endpoint: options.endpoint,
    action: options.action,
    identifierHash: options.identifier ? hashIdentifier(options.identifier) : undefined,
    ipAddress: normalizeIp(request),
    userAgent: request.headers.get("user-agent") ?? "unknown",
  })

  if (result.valid) {
    return null
  }

  recordAuthMetric("auth.login.failed", {
    endpoint: options.endpoint,
    reason: "captcha_failed",
  })

  return NextResponse.json({ message: "Captcha verification failed" }, { status: 403 })
}
