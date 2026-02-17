import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"
import { isFeatureFlagEnabled } from "@/lib/feature-flags"

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
  if (!cookieHeader || !process.env.NEXTAUTH_SECRET) {
    return null
  }

  const token = LEGACY_NEXT_AUTH_COOKIE_NAMES.map((cookieName) => parseCookieValue(cookieHeader, cookieName)).find(Boolean)
  if (!token) {
    return null
  }

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
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
    return null
  }
}

export async function getAuthSessionFromHeaders(requestHeaders: Headers): Promise<BetterAuthSession | null> {
  const betterAuthSession = await auth.api.getSession({ headers: requestHeaders })
  if (betterAuthSession?.user) {
    return betterAuthSession
  }

  const useBetterAuth = await isFeatureFlagEnabled("use_better_auth")
  if (useBetterAuth) {
    return null
  }

  return readLegacyNextAuthSession(requestHeaders.get("cookie"))
}
