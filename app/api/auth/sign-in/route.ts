import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { auth } from "@/lib/auth"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"
import { applyAuthCaptchaMiddleware } from "@/lib/auth/captcha-middleware"

function buildPrincipalFingerprint(email: unknown) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "unknown"
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const principalFingerprint = buildPrincipalFingerprint(body?.email)

  const captchaFailure = await applyAuthCaptchaMiddleware(request, {
    endpoint: "sign-in",
    action: "sign-in",
    body,
    identifier: typeof body?.email === "string" ? body.email : undefined,
  })
  if (captchaFailure) {
    return captchaFailure
  }

  recordAuthMetric("auth.login.attempt", { endpoint: "sign-in", principalFingerprint })
  await recordSecurityAuditEvent({
    event: "auth.login.attempt",
    resource: "auth",
    request,
    details: {
      endpoint: "sign-in",
      rememberMe: Boolean(body?.rememberMe),
      callbackURLProvided: Boolean(body?.callbackURL),
    },
  })

  const response = await auth.api.signInEmail({
    headers: request.headers,
    body: {
      email: body.email,
      password: body.password,
      callbackURL: body.callbackURL,
      rememberMe: body.rememberMe,
    },
  })

  const isSuccess = !response || typeof response !== "object" || !("error" in response) || !response.error
  recordAuthMetric(isSuccess ? "auth.login.success" : "auth.login.failed", { endpoint: "sign-in", principalFingerprint })
  await recordSecurityAuditEvent({
    event: isSuccess ? "auth.login.success" : "auth.login.failed",
    resource: "auth",
    request,
    details: {
      endpoint: "sign-in",
    },
  })

  return NextResponse.json(response)
}
