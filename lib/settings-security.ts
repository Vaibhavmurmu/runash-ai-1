import { createHash, randomBytes } from "crypto"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { getSql } from "@/lib/db/neon"

const securityStateSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  apiKeyMasked: z.string().optional(),
  apiKeyLastRotatedAt: z.string().optional(),
  apiKeyHash: z.string().optional(),
})

export type SecurityState = z.infer<typeof securityStateSchema>

export async function resolveSettingsUserId(request: Request): Promise<number | null> {
  const session = await getServerSession(authOptions)
  const sessionId = Number(session?.user?.id)

  if (Number.isFinite(sessionId) && sessionId > 0) {
    return sessionId
  }

  const headerUserId = Number(request.headers.get("x-user-id"))
  if (Number.isFinite(headerUserId) && headerUserId > 0) {
    return headerUserId
  }

  return null
}

export function parseBio(rawBio: unknown): Record<string, unknown> {
  if (!rawBio) {
    return {}
  }

  if (typeof rawBio === "string") {
    try {
      return JSON.parse(rawBio) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  if (typeof rawBio === "object") {
    return rawBio as Record<string, unknown>
  }

  return {}
}

export function readSecurityState(rawBio: unknown): SecurityState {
  const parsedBio = parseBio(rawBio)
  const settings =
    parsedBio.userSettings && typeof parsedBio.userSettings === "object"
      ? (parsedBio.userSettings as Record<string, unknown>)
      : {}

  const parsed = securityStateSchema.safeParse(settings.security)
  if (!parsed.success) {
    return {
      twoFactorEnabled: false,
      apiKeyMasked: "Not generated",
      apiKeyLastRotatedAt: "",
    }
  }

  return {
    twoFactorEnabled: parsed.data.twoFactorEnabled ?? false,
    apiKeyMasked: parsed.data.apiKeyMasked ?? "Not generated",
    apiKeyLastRotatedAt: parsed.data.apiKeyLastRotatedAt ?? "",
    apiKeyHash: parsed.data.apiKeyHash,
  }
}

export async function updateUserSecurityState(userId: number, updater: (current: SecurityState) => SecurityState) {
  const sql = getSql()
  const [row] = await sql/* sql */`
    SELECT id, bio
    FROM public.users
    WHERE id = ${userId}
    LIMIT 1
  `

  if (!row) {
    return null
  }

  const parsedBio = parseBio(row.bio)
  const existingSecurity = readSecurityState(parsedBio)
  const nextSecurity = updater(existingSecurity)

  const userSettings =
    parsedBio.userSettings && typeof parsedBio.userSettings === "object"
      ? ({ ...(parsedBio.userSettings as Record<string, unknown>) } as Record<string, unknown>)
      : {}

  userSettings.security = {
    ...nextSecurity,
  }

  const [updated] = await sql/* sql */`
    UPDATE public.users
    SET bio = ${JSON.stringify({ ...parsedBio, userSettings })}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `

  if (!updated) {
    return null
  }

  return nextSecurity
}

export function generateApiKey() {
  const value = `runash_${randomBytes(24).toString("hex")}`
  const hash = createHash("sha256").update(value).digest("hex")
  const masked = `${value.slice(0, 10)}••••••${value.slice(-4)}`

  return {
    apiKey: value,
    apiKeyHash: hash,
    apiKeyMasked: masked,
    apiKeyLastRotatedAt: new Date().toISOString(),
  }
}
