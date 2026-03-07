import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getServerAuthSession } from "@/lib/auth/session"
import { CloudStorage } from "@/lib/cloud-storage"
import {
  ALLOWED_CHAT_ATTACHMENT_TYPES,
  CHAT_ATTACHMENT_LIMIT,
  CHAT_ATTACHMENT_MAX_SIZE,
  computeSha256Hex,
  countAttachmentsForMessage,
  createChatAttachmentRecord,
  ensurePendingChatMessageOwnership,
} from "@/lib/repositories/chat-attachments"
import { logApiEvent } from "@/lib/api/logging"
import { resolveRequestId } from "@/lib/api/response"

const requestSchema = z.object({
  sessionId: z.string().trim().min(1),
  pendingMessageId: z.string().trim().min(1).optional(),
  mode: z.enum(["signed", "multipart"]).default("signed"),
  name: z.string().trim().min(1).max(255).optional(),
  type: z.string().trim().min(1).max(120).optional(),
  size: z.number().int().positive().max(CHAT_ATTACHMENT_MAX_SIZE).optional(),
  checksum: z.string().trim().regex(/^[a-fA-F0-9]{64}$/).optional(),
})

function buildStorageKey(userId: string, pendingMessageId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-")
  const hash = createHash("sha256").update(`${Date.now()}-${safeName}`).digest("hex").slice(0, 12)
  return `chat/attachments/${userId}/${pendingMessageId}/${hash}-${safeName}`
}

function validateTypeAndSize(type: string, size: number) {
  if (!ALLOWED_CHAT_ATTACHMENT_TYPES.has(type)) {
    throw new Error("INVALID_ATTACHMENT_TYPE")
  }

  if (!Number.isFinite(size) || size <= 0 || size > CHAT_ATTACHMENT_MAX_SIZE) {
    throw new Error("INVALID_ATTACHMENT_SIZE")
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const route = "/api/chat/attachments"
  const startedAt = Date.now()
  const logMetric = (name: string, details: Record<string, unknown>, level: "info" | "warn" | "error" = "info") => {
    logApiEvent(level, `chat.attachments.metric.${name}`, {
      requestId,
      route,
      method: "POST",
      details,
    })
  }

  logMetric("request_start", { status: "started" })

  const session = await getServerAuthSession()
  const userId = String(session?.user?.id ?? "").trim()

  if (!userId) {
    logMetric("auth_rejection", { reason: "missing_session", status: 401 }, "warn")
    logMetric("request_end", { status: 401, latencyMs: Date.now() - startedAt, outcome: "rejected" }, "warn")
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 })
  }

  const contentType = request.headers.get("content-type") || ""

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const sessionId = String(form.get("sessionId") ?? "").trim()
      const pendingMessageId = String(form.get("pendingMessageId") ?? "").trim() || undefined
      const expectedChecksum = String(form.get("checksum") ?? "").trim().toLowerCase()
      const file = form.get("file")

      if (!sessionId || !(file instanceof File)) {
        logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "invalid_request" }, "warn")
        return NextResponse.json({ error: "sessionId and file are required", code: "INVALID_REQUEST" }, { status: 400 })
      }

      validateTypeAndSize(file.type, file.size)

      const pendingMessage = await ensurePendingChatMessageOwnership({
        userId,
        sessionId,
        pendingMessageId,
      })

      const existingCount = await countAttachmentsForMessage(pendingMessage.messageId)
      if (existingCount + 1 > CHAT_ATTACHMENT_LIMIT) {
        logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "limit_exceeded" }, "warn")
        return NextResponse.json({ error: "Attachment limit exceeded", code: "INVALID_ATTACHMENT" }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const actualChecksum = computeSha256Hex(buffer)
      if (!expectedChecksum || expectedChecksum !== actualChecksum) {
        logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "checksum_mismatch" }, "warn")
        return NextResponse.json({ error: "Attachment checksum mismatch", code: "INVALID_ATTACHMENT" }, { status: 400 })
      }

      const storageKey = buildStorageKey(userId, pendingMessage.messageId, file.name)
      await CloudStorage.uploadFile(storageKey, buffer, file.type)

      const attachment = await createChatAttachmentRecord({
        messageId: pendingMessage.messageId,
        storageKey,
        mimeType: file.type,
        size: file.size,
        checksum: actualChecksum,
      })

      logMetric("request_end", { status: 200, latencyMs: Date.now() - startedAt, outcome: "uploaded_multipart" })
      return NextResponse.json({
        data: {
          attachment,
          pendingMessageId: pendingMessage.messageId,
          upload: { mode: "multipart", status: "uploaded" },
        },
      })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "invalid_request" }, "warn")
      return NextResponse.json({ error: "Invalid attachment request", code: "INVALID_REQUEST", details: parsed.error.flatten() }, { status: 400 })
    }

    const payload = parsed.data

    if (payload.mode === "multipart") {
      logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "invalid_mode" }, "warn")
      return NextResponse.json({ error: "Use multipart/form-data with file for multipart mode", code: "INVALID_REQUEST" }, { status: 400 })
    }

    if (!payload.type || !payload.size || !payload.name || !payload.checksum) {
      logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "missing_signed_fields" }, "warn")
      return NextResponse.json({ error: "name, type, size and checksum are required for signed mode", code: "INVALID_REQUEST" }, { status: 400 })
    }

    validateTypeAndSize(payload.type, payload.size)

    const pendingMessage = await ensurePendingChatMessageOwnership({
      userId,
      sessionId: payload.sessionId,
      pendingMessageId: payload.pendingMessageId,
    })

    const existingCount = await countAttachmentsForMessage(pendingMessage.messageId)
    if (existingCount + 1 > CHAT_ATTACHMENT_LIMIT) {
      logMetric("request_end", { status: 400, latencyMs: Date.now() - startedAt, outcome: "limit_exceeded" }, "warn")
      return NextResponse.json({ error: "Attachment limit exceeded", code: "INVALID_ATTACHMENT" }, { status: 400 })
    }

    const storageKey = buildStorageKey(userId, pendingMessage.messageId, payload.name)
    const attachment = await createChatAttachmentRecord({
      messageId: pendingMessage.messageId,
      storageKey,
      mimeType: payload.type,
      size: payload.size,
      checksum: payload.checksum,
    })

    const expiresInSeconds = 15 * 60
    const uploadUrl = await CloudStorage.getSignedUploadUrl(storageKey, payload.type, expiresInSeconds)

    logMetric("request_end", { status: 200, latencyMs: Date.now() - startedAt, outcome: "signed_url_issued" })
    return NextResponse.json({
      data: {
        attachment,
        pendingMessageId: pendingMessage.messageId,
        upload: {
          mode: "signed",
          method: "PUT",
          url: uploadUrl,
          expiresInSeconds,
          headers: {
            "Content-Type": payload.type,
            "x-amz-checksum-sha256": payload.checksum,
          },
        },
      },
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR"
    const status = code === "SESSION_ACCESS_DENIED" ? 403 : code === "PENDING_MESSAGE_NOT_FOUND" ? 404 : 500
    const outcome = code === "SESSION_ACCESS_DENIED" ? "ownership_rejected" : code === "PENDING_MESSAGE_NOT_FOUND" ? "pending_message_not_found" : "upload_failed"
    logMetric("upload_failure", { code, status, outcome }, status >= 500 ? "error" : "warn")
    logMetric("request_end", { status, latencyMs: Date.now() - startedAt, outcome }, status >= 500 ? "error" : "warn")
    return NextResponse.json({ error: "Unable to process attachment upload", code }, { status })
  }
}
