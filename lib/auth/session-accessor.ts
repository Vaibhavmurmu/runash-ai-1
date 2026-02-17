import { jwtVerify } from "jose"
import { auth, getLegacySessionSecrets } from "@/lib/auth"
import { isFeatureFlagEnabled } from "@/lib/feature-flags"
import { recordAuthMetric } from "@/lib/auth-observability"
import { resolveSessionFromSources } from "@/lib/auth/session-accessor-handler"

const LEGACY_NEXT_AUTH_COOKIE_NAMES = ["next-auth.session-token", "__Secure-next-auth.session-token"] as const

type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>

function parseCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) {
    return null
  }

  for (const segment of cookieHeader.split(";")) {
    const [name, ...valueParts] = segment.trim().split("=")
    if (name !== cookieName) {
      continue
    }

    const cookieValue = valueParts.join("=")
    return cookieValue || null
  }

  return null
}

async function readLegacyNextAuthSession(cookieHeader: string | null): Promise<BetterAuthSession | null> {
  const fallbackSecrets = getLegacySessionSecrets()
  if (!cookieHeader || fallbackSecrets.length === 0) {
    return null
  }

  const token = LEGACY_NEXT_AUTH_COOKIE_NAMES.map((cookieName) => parseCookieValue(cookieHeader, cookieName)).find(Boolean)
  if (!token) {
    return null
  }

  for (const legacySecret of fallbackSecrets) {
    try {
      const secret = new TextEncoder().encode(legacySecret)
      const { payload } = await jwtVerify(token, secret)

      if (!payload.sub) {
        return null
      }

      return {
        session: {
          id: payload.jti ? String(payload.jti) : `legacy-${String(payload.sub)}`,
          token,
          userId: String(payload.sub),
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: String(payload.sub),
          email: typeof payload.email === "string" ? payload.email : undefined,
          name: typeof payload.name === "string" ? payload.name : undefined,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as BetterAuthSession
    } catch {
      continue
    }
  }

  return null
}

export async function getAuthSessionFromHeaders(requestHeaders: Headers): Promise<BetterAuthSession | null> {
  return resolveSessionFromSources({
    getPrimarySession: () => auth.api.getSession({ headers: requestHeaders }),
    isLegacyFallbackEnabled: () => isFeatureFlagEnabled("allow_legacy_next_auth_fallback"),
    getLegacySession: () => readLegacyNextAuthSession(requestHeaders.get("cookie")),
    recordMetric: recordAuthMetric,
    now: () => Date.now(),
  })
}
