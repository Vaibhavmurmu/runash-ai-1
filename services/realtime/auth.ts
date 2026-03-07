import { createHmac, timingSafeEqual } from "node:crypto"
import { sql } from "@/lib/db"
import type { RealtimeChannel } from "@/services/realtime/types"

type RealtimeTokenPayload = {
  userId: string
  channels: RealtimeChannel[]
  issuedAt: string
  expiresAt: string
}

const DEFAULT_SECRET = "runash-realtime-dev-secret"
const TOKEN_TTL_MS = 1000 * 60 * 15

function secret() {
  return process.env.REALTIME_GATEWAY_SECRET || process.env.AUTH_SECRET || DEFAULT_SECRET
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", secret()).update(encodedPayload).digest("base64url")
}

function isEditorChannel(value: string): value is `editor:${string}` {
  return value.startsWith("editor:") && value.length > "editor:".length
}

function isStreamChannel(value: string): value is `stream:${string}` {
  return value.startsWith("stream:") && value.length > "stream:".length
}

function asRealtimeChannel(value: string): RealtimeChannel | null {
  if (isEditorChannel(value) || isStreamChannel(value)) return value
  return null
}

async function canAccessEditorProject(userId: string, projectId: string): Promise<boolean> {
  const rows = await sql<{ id: string }>`
    SELECT id
    FROM editor_projects
    WHERE id=${projectId}
      AND owner_id=${userId}
    LIMIT 1
  `

  return rows.length > 0
}

async function canAccessStreamSession(userId: string, sessionId: string): Promise<boolean> {
  const numericUserId = Number(userId)
  if (!Number.isFinite(numericUserId)) return false

  const rows = await sql<{ id: string }>`
    SELECT id
    FROM live_stream_sessions
    WHERE id=${sessionId}
      AND owner_user_id=${numericUserId}
    LIMIT 1
  `

  return rows.length > 0
}

export async function authorizeRealtimeChannels(userId: string, requested: string[]): Promise<RealtimeChannel[]> {
  const normalized = Array.from(new Set(requested.map((entry) => entry.trim()).filter(Boolean)))
  const allowed: RealtimeChannel[] = []

  for (const channelRaw of normalized) {
    const channel = asRealtimeChannel(channelRaw)
    if (!channel) continue

    if (channel.startsWith("editor:")) {
      const projectId = channel.slice("editor:".length)
      if (await canAccessEditorProject(userId, projectId)) {
        allowed.push(channel)
      }
      continue
    }

    const sessionId = channel.slice("stream:".length)
    if (await canAccessStreamSession(userId, sessionId)) {
      allowed.push(channel)
    }
  }

  return allowed
}

export function issueRealtimeToken(input: { userId: string; channels: RealtimeChannel[] }): string {
  const now = Date.now()
  const payload: RealtimeTokenPayload = {
    userId: input.userId,
    channels: input.channels,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyRealtimeToken(token: string): RealtimeTokenPayload | null {
  const [encodedPayload, providedSignature] = token.split(".")
  if (!encodedPayload || !providedSignature) return null

  const expected = sign(encodedPayload)
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(providedSignature)
  if (expectedBuffer.length !== providedBuffer.length) return null
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as RealtimeTokenPayload
    const expiresAtMs = Date.parse(parsed.expiresAt)
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return null

    const channels = parsed.channels.map((entry) => asRealtimeChannel(entry)).filter((entry): entry is RealtimeChannel => Boolean(entry))
    return {
      userId: parsed.userId,
      channels,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}
