import { SESSION_SECURITY_POLICY } from "../auth-security-config.ts"

type SessionShape = {
  session: {
    id: string
    createdAt: Date | string
    updatedAt: Date | string
  }
  user?: Record<string, unknown> | null
}

type SessionAccessorDependencies<TSession extends SessionShape> = {
  getPrimarySession: () => Promise<TSession | null>
  getLegacySession: () => Promise<TSession | null>
  isLegacyFallbackEnabled: () => Promise<boolean>
  recordMetric: (name: "auth.session.invalidated" | "auth.session.rotation_due" | "auth.legacy_fallback.used" | "auth.legacy_fallback.unavailable", tags?: Record<string, string>) => void
  now: () => number
}

export async function resolveSessionFromSources<TSession extends SessionShape>(
  dependencies: SessionAccessorDependencies<TSession>,
): Promise<TSession | null> {
  const betterAuthSession = await dependencies.getPrimarySession()

  if (betterAuthSession?.user) {
    const now = dependencies.now()
    const createdAt = new Date(betterAuthSession.session.createdAt).getTime()
    const updatedAt = new Date(betterAuthSession.session.updatedAt).getTime()

    if (now - createdAt > SESSION_SECURITY_POLICY.absoluteTimeoutMs || now - updatedAt > SESSION_SECURITY_POLICY.inactivityTimeoutMs) {
      dependencies.recordMetric("auth.session.invalidated", {
        reason: now - createdAt > SESSION_SECURITY_POLICY.absoluteTimeoutMs ? "absolute_expiry" : "inactivity_expiry",
      })
      return null
    }

    if (now - updatedAt > SESSION_SECURITY_POLICY.rotationIntervalMs) {
      dependencies.recordMetric("auth.session.rotation_due", {
        reason: "rotation_interval_exceeded",
      })
    }

    return betterAuthSession
  }

  const useLegacyFallback = await dependencies.isLegacyFallbackEnabled()
  if (!useLegacyFallback) {
    dependencies.recordMetric("auth.legacy_fallback.unavailable", { reason: "flag_disabled_or_sunset" })
    return null
  }

  const legacySession = await dependencies.getLegacySession()
  if (legacySession?.user) {
    dependencies.recordMetric("auth.legacy_fallback.used", { reason: "primary_session_missing" })
  }

  return legacySession
}
