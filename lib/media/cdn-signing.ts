import crypto from "node:crypto"

const DEFAULT_TTL_SECONDS = 15 * 60

function getCdnSecret(): string {
  return process.env.RUNASH_MEDIA_CDN_SIGNING_SECRET || process.env.AWS_SECRET_ACCESS_KEY || "dev-media-cdn-secret"
}

export function resolveMediaUrlTtlSeconds(kind: "manifest" | "binary" = "binary") {
  const raw = kind === "manifest" ? process.env.RUNASH_MEDIA_MANIFEST_URL_TTL_SECONDS : process.env.RUNASH_MEDIA_URL_TTL_SECONDS
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS
}

export function signCdnPath(path: string, expiresAtEpochSeconds: number) {
  const payload = `${path}:${expiresAtEpochSeconds}`
  const signature = crypto.createHmac("sha256", getCdnSecret()).update(payload).digest("base64url")
  return signature
}

export function buildSignedCdnUrl(cdnPath: string, kind: "manifest" | "binary" = "binary") {
  const baseUrl = (process.env.RUNASH_MEDIA_CDN_BASE_URL || "https://cdn.runash.local").replace(/\/$/, "")
  const normalizedPath = cdnPath.startsWith("/") ? cdnPath : `/${cdnPath}`
  const expires = Math.floor(Date.now() / 1000) + resolveMediaUrlTtlSeconds(kind)
  const sig = signCdnPath(normalizedPath, expires)
  const url = new URL(`${baseUrl}${normalizedPath}`)
  url.searchParams.set("exp", String(expires))
  url.searchParams.set("sig", sig)
  return { url: url.toString(), expiresAt: new Date(expires * 1000).toISOString(), expiresInSeconds: resolveMediaUrlTtlSeconds(kind) }
}
