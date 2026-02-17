import { betterAuth } from "better-auth"

const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

const secret = process.env.BETTER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

const oauthStepUpRequired = process.env.AUTH_ACCOUNT_LINK_STEP_UP_REQUIRED === "true"
const riskyLinkProviders = new Set(
  (process.env.AUTH_RISKY_ACCOUNT_LINK_PROVIDERS ?? "")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean),
)

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
  console.info("[auth.account-link]", {
    event,
    providerId: payload.providerId,
    userId: payload.userId,
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
          const riskyProviderLink = riskyLinkProviders.has(providerId)

          if ((oauthStepUpRequired || riskyProviderLink) && stepUpHeader !== "verified") {
            auditAccountLinkEvent("account_link_denied", {
              providerId,
              userId: account.userId,
              requestPath,
              subjectHash,
              reason: "step_up_verification_required",
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
  trustedOrigins: [baseURL],
})
