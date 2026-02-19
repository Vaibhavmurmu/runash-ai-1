import { betterAuth } from "better-auth"
import { createHash } from "node:crypto"
import { jwtVerify } from "jose"
import { recordAuthMetric } from "@/lib/auth-observability"
import { isFeatureFlagEnabled } from "@/lib/feature-flags"
import { resolveSessionFromSources } from "@/lib/auth/session-accessor-handler"
import { sql } from "@/lib/db"
import { evaluateAccountLinkingPolicy } from "@/lib/auth/plugins/account-linking-policy"
import { resolveGenericOAuthProviders } from "@/lib/auth/plugins/generic-oauth"
import { buildTrustedAuthOrigins } from "@/lib/auth/plugins/oauth-proxy"
import { resolveBearerAuthSession } from "@/lib/auth/session-modes"

const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

const secret = process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

export const AUTH_COOKIE_NAMES = ["better-auth.session-token", "__Secure-better-auth.session-token"] as const
const LEGACY_NEXT_AUTH_COOKIE_NAMES = ["next-auth.session-token", "__Secure-next-auth.session-token"] as const

export type BetterAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>

export interface ServerAuthSession {
  user: {
    id: string
    role: string
    ssoOrganization: number | null
    email?: string | null
    name?: string | null
  }
}

export interface AuthenticatedSessionUser {
  userId: string
  role: string
  organizationId: number | null
  email?: string | null
  name?: string | null
}

export function getAuthSecret(): string {
  const resolvedSecret = process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!resolvedSecret) {
    throw new Error("Missing auth secret: set BETTER_AUTH_SECRET (or NEXTAUTH_SECRET for migration compatibility)")
  }

  return resolvedSecret
}

export function getLegacySessionSecrets(): string[] {
  const secrets = [process.env.NEXTAUTH_SECRET, process.env.BETTER_AUTH_SECRET].filter(
    (value): value is string => Boolean(value),
  )

  return [...new Set(secrets)]
}

const genericOAuthProviders = resolveGenericOAuthProviders()

type AuthAccountLink = {
  userId: string
  providerId: string
  accountId: string
  idToken?: string | null
}

type AuthUser = {
  id: string
  emailVerified?: boolean
}

type AuthHookContext = {
  path?: string
  request?: {
    headers?: Headers
  }
  context?: {
    internalAdapter?: {
      findUserById?: (userId: string) => Promise<AuthUser | null>
      findAccountByProviderId?: (accountId: string, providerId: string) => Promise<AuthAccountLink | null>
    }
  }
}

function redactSubject(accountId: string) {
  if (accountId.length <= 6) {
    return "***"
  }

  return `${accountId.slice(0, 3)}***${accountId.slice(-3)}`
}

function anonymizeUserId(userId: string) {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12)
}

function auditAccountLinkEvent(
  event: "account_link_attempt" | "account_link_denied" | "account_link_allowed",
  payload: {
    providerId: string
    userId: string
    reason?: string
    requestPath?: string
    subjectHash?: string
  },
) {
  recordAuthMetric(event === "account_link_allowed" ? "auth.account_link.allowed" : "auth.account_link.denied", {
    providerId: payload.providerId,
    reason: payload.reason ?? "none",
  })

  console.info("[auth.account-link]", {
    event,
    providerId: payload.providerId,
    userIdHash: anonymizeUserId(payload.userId),
    reason: payload.reason,
    requestPath: payload.requestPath,
    subjectHash: payload.subjectHash,
  })
}

export const auth = betterAuth({
  appName: "RunAsh AI",
  baseURL,
  secret,
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [],
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          },
        }
      : {}),
    ...(process.env.HUGGINGFACE_CLIENT_ID && process.env.HUGGINGFACE_CLIENT_SECRET
      ? {
          huggingface: {
            clientId: process.env.HUGGINGFACE_CLIENT_ID,
            clientSecret: process.env.HUGGINGFACE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          },
        }
      : {}),
    ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
      ? {
          linkedin: {
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          },
        }
      : {}),
    ...(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
      ? {
          twitter: {
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: false,
          },
        }
      : {}),
    ...genericOAuthProviders,
  },
  databaseHooks: {
    account: {
      create: {
        before: async (account: AuthAccountLink, context?: AuthHookContext) => {
          const providerId = account.providerId.toLowerCase()
          const requestPath = context?.path
          const subjectHash = redactSubject(account.accountId)

          auditAccountLinkEvent("account_link_attempt", {
            providerId,
            userId: account.userId,
            requestPath,
            subjectHash,
          })

          const internalAdapter = context?.context?.internalAdapter
          const [existingProviderSubject, currentUser] = await Promise.all([
            internalAdapter?.findAccountByProviderId?.(account.accountId, account.providerId),
            internalAdapter?.findUserById?.(account.userId),
          ])

          if (existingProviderSubject && existingProviderSubject.userId !== account.userId) {
            auditAccountLinkEvent("account_link_denied", {
              providerId,
              userId: account.userId,
              requestPath,
              subjectHash,
              reason: "provider_subject_already_linked_to_another_user",
            })
            return false
          }

          if (!currentUser?.emailVerified) {
            auditAccountLinkEvent("account_link_denied", {
              providerId,
              userId: account.userId,
              requestPath,
              subjectHash,
              reason: "primary_user_email_not_verified",
            })
            return false
          }

          const stepUpHeader = context?.request?.headers?.get("x-runash-link-step-up")
          const identityHeader = context?.request?.headers?.get("x-runash-identity-verified")
          const hasVerifiedIdentityHeader = identityHeader === "verified" || stepUpHeader === "verified"
          const hasProviderIdentityToken = Boolean(account.idToken && account.idToken.length > 12)
          const userAgent = context?.request?.headers?.get("user-agent")

          const accountLinkingPolicy = evaluateAccountLinkingPolicy({
            providerId,
            requestPath,
            userAgent,
            hasVerifiedIdentityHeader,
            hasProviderIdentityToken,
            currentUserEmailVerified: Boolean(currentUser?.emailVerified),
          })

          if (!accountLinkingPolicy.allowed) {
            auditAccountLinkEvent("account_link_denied", {
              providerId,
              userId: account.userId,
              requestPath,
              subjectHash,
              reason: accountLinkingPolicy.reason,
            })
            return false
          }

          auditAccountLinkEvent("account_link_allowed", {
            providerId,
            userId: account.userId,
            requestPath,
            subjectHash,
          })

          return true
        },
      },
    },
  },
  trustedOrigins: buildTrustedAuthOrigins(baseURL),
})

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
      const secretBytes = new TextEncoder().encode(legacySecret)
      const { payload } = await jwtVerify(token, secretBytes)

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
  const authorizationHeader = requestHeaders.get("authorization")
  if (authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    const bearerToken = authorizationHeader.slice(7).trim()
    if (bearerToken) {
      const bearerSession = await resolveBearerAuthSession(bearerToken)
      if (bearerSession) {
        return {
          session: {
            id: bearerSession.sessionId,
            token: "[redacted]",
            userId: bearerSession.userId,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          user: {
            id: bearerSession.userId,
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as BetterAuthSession
      }
    }
  }

  return resolveSessionFromSources({
    getPrimarySession: () => auth.api.getSession({ headers: requestHeaders }),
    isLegacyFallbackEnabled: () => isFeatureFlagEnabled("allow_legacy_next_auth_fallback"),
    getLegacySession: () => readLegacyNextAuthSession(requestHeaders.get("cookie")),
    recordMetric: recordAuthMetric,
    now: () => Date.now(),
  })
}

async function getRuntimeRequestHeaders(): Promise<Headers> {
  return (await (await import("next/headers")).headers()) as Headers
}

export async function getServerAuthSession(requestHeaders?: Headers): Promise<ServerAuthSession | null> {
  const resolvedHeaders = requestHeaders ?? (await getRuntimeRequestHeaders())
  const session = await getAuthSessionFromHeaders(resolvedHeaders)

  if (!session?.user) {
    return null
  }

  const [dbUser] =
    session.user.email
      ? await sql`
          SELECT id::text AS id, role, sso_organization_id
          FROM users
          WHERE email = ${session.user.email}
          LIMIT 1
        `
      : []

  return {
    user: {
      id: dbUser?.id ?? String(session.user.id),
      role: dbUser?.role ?? "user",
      ssoOrganization: dbUser?.sso_organization_id ?? null,
      email: session.user.email,
      name: session.user.name,
    },
  }
}

export async function getAuthenticatedSessionUser(): Promise<AuthenticatedSessionUser | null> {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return null
  }

  return {
    userId: session.user.id,
    role: session.user.role ?? "user",
    organizationId: session.user.ssoOrganization ?? null,
    email: session.user.email,
    name: session.user.name,
  }
}

export function isSessionAuthorizedForScope(
  sessionUser: AuthenticatedSessionUser,
  scope: { userId?: string | number | null; organizationId?: string | number | null },
): boolean {
  if (scope.userId !== undefined && scope.userId !== null && String(scope.userId) !== sessionUser.userId) {
    return false
  }

  if (scope.organizationId === undefined || scope.organizationId === null) {
    return true
  }

  if (!sessionUser.organizationId) {
    return false
  }

  return Number(scope.organizationId) === sessionUser.organizationId
}
