import { createHash } from "crypto"

import { sql } from "@/lib/db"

export const CHAT_ATTACHMENT_LIMIT = 4
export const CHAT_ATTACHMENT_MAX_SIZE = 8 * 1024 * 1024

export const ALLOWED_CHAT_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
])

export type ChatAttachmentRecord = {
  id: string
  message_id: string
  storage_key: string | null
  storage_url: string | null
  mime_type: string
  size: number
  width: number | null
  height: number | null
  checksum: string | null
  created_at: string
}

function normalizeChecksum(value: string): string {
  return value.trim().toLowerCase()
}

export function computeSha256Hex(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex")
}

export async function ensurePendingChatMessageOwnership(input: {
  userId: string
  sessionId: string
  pendingMessageId?: string | null
}): Promise<{ messageId: string }> {
  const pendingMessageId = input.pendingMessageId?.trim() || null

  if (pendingMessageId) {
    const rows = await sql<Array<{ id: string }>>`
      SELECT m.id::text AS id
      FROM chat_messages m
      INNER JOIN chat_sessions s ON s.id = m.session_id
      WHERE m.id::text = ${pendingMessageId}
        AND m.session_id = ${input.sessionId}
        AND s.user_id = ${input.userId}
        AND m.role = 'user'
        AND m.status = 'pending'
      LIMIT 1
    `

    if (!rows[0]) {
      throw new Error("PENDING_MESSAGE_NOT_FOUND")
    }

    return { messageId: rows[0].id }
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO chat_messages (session_id, role, content, status, metadata)
    SELECT ${input.sessionId}, 'user', '[pending-attachment]', 'pending', jsonb_build_object('upload_state', 'pending')
    WHERE EXISTS (
      SELECT 1
      FROM chat_sessions s
      WHERE s.id = ${input.sessionId} AND s.user_id = ${input.userId}
    )
    RETURNING id::text AS id
  `

  if (!rows[0]) {
    throw new Error("SESSION_ACCESS_DENIED")
  }

  return { messageId: rows[0].id }
}

export async function countAttachmentsForMessage(messageId: string): Promise<number> {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM chat_attachments
    WHERE message_id::text = ${messageId}
  `

  return Number(rows[0]?.count ?? 0)
}

export async function createChatAttachmentRecord(input: {
  messageId: string
  storageKey?: string | null
  storageUrl?: string | null
  mimeType: string
  size: number
  width?: number | null
  height?: number | null
  checksum?: string | null
}): Promise<ChatAttachmentRecord> {
  const rows = await sql<ChatAttachmentRecord[]>`
    INSERT INTO chat_attachments (message_id, storage_key, storage_url, mime_type, size, width, height, checksum)
    VALUES (
      ${input.messageId}::bigint,
      ${input.storageKey ?? null},
      ${input.storageUrl ?? null},
      ${input.mimeType},
      ${input.size},
      ${input.width ?? null},
      ${input.height ?? null},
      ${input.checksum ? normalizeChecksum(input.checksum) : null}
    )
    RETURNING
      id::text,
      message_id::text,
      storage_key,
      storage_url,
      mime_type,
      size::int,
      width,
      height,
      checksum,
      created_at::text
  `

  return rows[0]
}

export async function listOwnedChatAttachmentsByIds(input: {
  userId: string
  attachmentIds: string[]
}): Promise<ChatAttachmentRecord[]> {
  if (input.attachmentIds.length === 0) return []

  const rows = await sql<ChatAttachmentRecord[]>`
    SELECT
      a.id::text,
      a.message_id::text,
      a.storage_key,
      a.storage_url,
      a.mime_type,
      a.size::int,
      a.width,
      a.height,
      a.checksum,
      a.created_at::text
    FROM chat_attachments a
    INNER JOIN chat_messages m ON m.id = a.message_id
    INNER JOIN chat_sessions s ON s.id = m.session_id
    WHERE s.user_id = ${input.userId}
      AND a.id::text = ANY(${input.attachmentIds}::text[])
  `

  return rows
}

export async function getOwnedChatAttachmentById(input: {
  userId: string
  attachmentId: string
}): Promise<ChatAttachmentRecord | null> {
  const rows = await sql<ChatAttachmentRecord[]>`
    SELECT
      a.id::text,
      a.message_id::text,
      a.storage_key,
      a.storage_url,
      a.mime_type,
      a.size::int,
      a.width,
      a.height,
      a.checksum,
      a.created_at::text
    FROM chat_attachments a
    INNER JOIN chat_messages m ON m.id = a.message_id
    INNER JOIN chat_sessions s ON s.id = m.session_id
    WHERE s.user_id = ${input.userId}
      AND a.id::text = ${input.attachmentId}
    LIMIT 1
  `

  return rows[0] ?? null
}

export async function markPendingMessageAsCompleted(input: {
  userId: string
  sessionId: string
  messageId: string
  content: string
  metadata?: Record<string, unknown>
}): Promise<boolean> {
  const rows = await sql<Array<{ id: string }>>`
    UPDATE chat_messages m
    SET
      status = 'completed',
      content = ${input.content},
      metadata = COALESCE(m.metadata, '{}'::jsonb) || ${JSON.stringify(input.metadata ?? {})}::jsonb,
      updated_at = now()
    FROM chat_sessions s
    WHERE m.session_id = s.id
      AND m.id::text = ${input.messageId}
      AND m.session_id = ${input.sessionId}
      AND m.role = 'user'
      AND s.user_id = ${input.userId}
      AND m.status IN ('pending', 'completed')
    RETURNING m.id::text AS id
  `

  return Boolean(rows[0])
}
