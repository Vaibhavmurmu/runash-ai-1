export type AuthEndpointRateLimit = {
  limit: number
  windowMs: number
}

export const AUTH_ENDPOINT_RATE_LIMITS: Record<string, AuthEndpointRateLimit> = {
  "sign-in": { limit: 5, windowMs: 15 * 60 * 1000 },
  "sign-out": { limit: 20, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 15 * 60 * 1000 },
  "forgot-password": { limit: 3, windowMs: 15 * 60 * 1000 },
  "reset-password": { limit: 5, windowMs: 15 * 60 * 1000 },
  "change-password": { limit: 5, windowMs: 15 * 60 * 1000 },
  "verify-email": { limit: 10, windowMs: 60 * 60 * 1000 },
  "resend-verification": { limit: 5, windowMs: 60 * 60 * 1000 },
  "magic-link": { limit: 6, windowMs: 15 * 60 * 1000 },
  "magic-link/verify": { limit: 10, windowMs: 15 * 60 * 1000 },
  "otp/email": { limit: 8, windowMs: 15 * 60 * 1000 },
  "otp/sms": { limit: 6, windowMs: 15 * 60 * 1000 },
  "2fa/verify": { limit: 8, windowMs: 15 * 60 * 1000 },
  "passkey/authenticate": { limit: 10, windowMs: 15 * 60 * 1000 },
}

export const DEFAULT_AUTH_RATE_LIMIT: AuthEndpointRateLimit = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
}

export const SESSION_SECURITY_POLICY = {
  rotationIntervalMs: Number(process.env.AUTH_SESSION_ROTATION_INTERVAL_MS ?? 30 * 60 * 1000),
  inactivityTimeoutMs: Number(process.env.AUTH_SESSION_INACTIVITY_TIMEOUT_MS ?? 30 * 60 * 1000),
  absoluteTimeoutMs: Number(process.env.AUTH_SESSION_ABSOLUTE_TIMEOUT_MS ?? 24 * 60 * 60 * 1000),
}

export function getAuthEndpointRateLimit(pathname: string): AuthEndpointRateLimit {
  const endpoint = pathname.replace(/^\/api\/auth\/?/, "")
  if (!endpoint) {
    return DEFAULT_AUTH_RATE_LIMIT
  }

  return AUTH_ENDPOINT_RATE_LIMITS[endpoint] ?? AUTH_ENDPOINT_RATE_LIMITS[endpoint.split("/").slice(-1)[0]] ?? DEFAULT_AUTH_RATE_LIMIT
}
