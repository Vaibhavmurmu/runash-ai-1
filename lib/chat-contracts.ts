import { z } from "zod"

export const CHAT_ERROR_CODES = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_ATTACHMENT: "INVALID_ATTACHMENT",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  INVALID_REQUEST: "INVALID_REQUEST",
} as const

export const chatAttachmentSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  url: z.string().trim().url().max(2000).optional(),
  name: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(8 * 1024 * 1024),
  type: z.string().trim().min(1).max(120),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  checksum: z.string().trim().min(1).max(128).optional(),
})

export const clientRequestIdSchema = z.string().trim().min(8).max(128)

export const streamRetrySchema = z
  .object({
    mode: z.enum(["none", "auto", "manual"]).default("auto"),
    maxAttempts: z.number().int().min(0).max(3).default(1),
  })
  .default({ mode: "auto", maxAttempts: 1 })

const mobileCursorPrefix = "mc_"

export function encodeMobileCursor(cursorSequence: number): string {
  return `${mobileCursorPrefix}${cursorSequence}`
}

export function decodeMobileCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0
  if (cursor.startsWith(mobileCursorPrefix)) {
    const value = Number(cursor.slice(mobileCursorPrefix.length))
    return Number.isInteger(value) && value >= 0 ? value : 0
  }

  const legacyDate = Date.parse(cursor)
  if (!Number.isNaN(legacyDate)) return 0

  const raw = Number(cursor)
  return Number.isInteger(raw) && raw >= 0 ? raw : 0
}

