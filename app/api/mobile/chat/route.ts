import { z } from "zod"

import { respondError, respondSuccess, resolveRequestId } from "@/lib/api/response"
import { CHAT_ERROR_CODES, chatAttachmentSchema, clientRequestIdSchema } from "@/lib/chat-contracts"
import { createMobileChatMessage, listMobileChatMessages } from "@/lib/repositories/mobile-app"

const createMobileMessageSchema = z.object({
  platform: z.string().trim().min(1),
  username: z.string().trim().min(1),
  message: z.string().trim().min(1).max(2000),
  clientRequestId: clientRequestIdSchema.optional(),
  attachments: z.array(chatAttachmentSchema).max(3).optional(),
  isModerator: z.boolean().optional(),
  isSubscriber: z.boolean().optional(),
})

export async function GET(request: Request) {
  const requestId = resolveRequestId(request)

  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get("cursor") ?? searchParams.get("since") ?? undefined
    const limit = Number(searchParams.get("limit") ?? 200)

    const response = await listMobileChatMessages(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200, since)
    return respondSuccess(request, response, { requestId })
  } catch {
    return respondError(request, { code: "MOBILE_CHAT_FETCH_FAILED", message: "Unable to fetch mobile chat history" }, { status: 500, requestId })
  }
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request)

  try {
    const payload = await request.json().catch(() => ({}))
    const parsed = createMobileMessageSchema.safeParse(payload)

    if (!parsed.success) {
      const hasAttachmentIssue = parsed.error.issues.some((issue) => issue.path.includes("attachments"))
      return respondError(
        request,
        {
          code: hasAttachmentIssue ? CHAT_ERROR_CODES.INVALID_ATTACHMENT : CHAT_ERROR_CODES.INVALID_REQUEST,
          message: hasAttachmentIssue ? "Invalid attachment metadata" : "platform, username and message are required",
        },
        { status: 400, requestId },
      )
    }

    const response = await createMobileChatMessage(parsed.data)
    return respondSuccess(request, response, { status: 201, requestId })
  } catch {
    return respondError(request, { code: "MOBILE_CHAT_SEND_FAILED", message: "Unable to send mobile chat message" }, { status: 500, requestId })
  }
}
