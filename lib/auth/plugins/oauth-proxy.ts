const explicitAllowedHosts = (process.env.AUTH_OAUTH_PROXY_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

function isAllowedPreviewHost(hostname: string) {
  if (explicitAllowedHosts.includes(hostname)) {
    return true
  }

  if (process.env.VERCEL_ENV === "preview" && hostname.endsWith(".vercel.app")) {
    return true
  }

  return false
}

export function isAllowedOAuthProxyTarget(url: URL, requestHost?: string | null) {
  const hostname = url.hostname.toLowerCase()
  if (requestHost && hostname === requestHost.toLowerCase()) {
    return true
  }

  return isAllowedPreviewHost(hostname)
}

export function buildTrustedAuthOrigins(baseURL: string) {
  const base = new URL(baseURL)
  const configuredOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  const origins = new Set<string>([base.origin, ...configuredOrigins])

  if (process.env.VERCEL_ENV === "preview") {
    origins.add("https://vercel.app")
  }

  return [...origins]
}

export function buildOAuthProxyRedirect(target: string, searchParams: URLSearchParams, requestHost?: string | null) {
  const destination = new URL(target)
  if (!isAllowedOAuthProxyTarget(destination, requestHost)) {
    return null
  }

  const passthrough = new URLSearchParams(searchParams)
  passthrough.delete("target")

  passthrough.forEach((value, key) => {
    destination.searchParams.set(key, value)
  })

  return destination.toString()
}
