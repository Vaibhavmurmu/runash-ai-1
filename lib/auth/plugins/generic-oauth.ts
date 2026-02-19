import { recordAuthMetric } from "@/lib/auth-observability"

export interface GenericOAuthProviderConfig {
  id: string
  clientId: string
  clientSecret: string
  scopes?: string[]
  authorizationUrl?: string
  tokenUrl?: string
  userInfoUrl?: string
  issuer?: string
  pkce?: boolean
}

function parseProvidersFromEnv(): GenericOAuthProviderConfig[] {
  const raw = process.env.AUTH_GENERIC_OAUTH_PROVIDERS
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Array<Partial<GenericOAuthProviderConfig>>
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((provider) => {
        const id = provider.id?.trim().toLowerCase()
        if (!id) {
          return null
        }

        const clientId = provider.clientId?.trim() || (provider.id ? process.env[`${provider.id.toUpperCase()}_CLIENT_ID`] : "")
        const clientSecret =
          provider.clientSecret?.trim() || (provider.id ? process.env[`${provider.id.toUpperCase()}_CLIENT_SECRET`] : "")

        if (!clientId || !clientSecret) {
          return null
        }

        return {
          id,
          clientId,
          clientSecret,
          scopes: provider.scopes,
          authorizationUrl: provider.authorizationUrl,
          tokenUrl: provider.tokenUrl,
          userInfoUrl: provider.userInfoUrl,
          issuer: provider.issuer,
          pkce: provider.pkce,
        } satisfies GenericOAuthProviderConfig
      })
      .filter((provider): provider is GenericOAuthProviderConfig => Boolean(provider))
  } catch {
    recordAuthMetric("auth.oauth.generic_provider_parse_failed")
    return []
  }
}

export function resolveGenericOAuthProviders() {
  const providers = parseProvidersFromEnv()

  return providers.reduce<Record<string, Record<string, unknown>>>((accumulator, provider) => {
    accumulator[provider.id] = {
      clientId: provider.clientId,
      clientSecret: provider.clientSecret,
      scope: provider.scopes?.join(" "),
      authorizationUrl: provider.authorizationUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      issuer: provider.issuer,
      pkce: provider.pkce ?? true,
      allowDangerousEmailAccountLinking: false,
    }

    return accumulator
  }, {})
}

export function getKnownOAuthProviderIds() {
  return Object.keys(resolveGenericOAuthProviders())
}
