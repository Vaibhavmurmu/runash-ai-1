import { NextRequest, NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { CloudStorage } from "@/lib/cloud-storage"
import { getOwnedChatAttachmentById } from "@/lib/repositories/chat-attachments"

export async function GET(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ attachmentId: string }> }) {
  const params = await routeParamsPromise
  const session = await getServerAuthSession()
  const userId = String(session?.user?.id ?? "").trim()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 })
  }

  const attachment = await getOwnedChatAttachmentById({ userId, attachmentId: params.attachmentId })
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found", code: "NOT_FOUND" }, { status: 404 })
  }

  if (!attachment.storage_key && !attachment.storage_url) {
    return NextResponse.json({ error: "Attachment not available", code: "NOT_READY" }, { status: 409 })
  }

  const mode = request.nextUrl.searchParams.get("mode") === "proxy" ? "proxy" : "signed"

  if (mode === "signed" && attachment.storage_key) {
    const url = await CloudStorage.getSignedDownloadUrl(attachment.storage_key, 300)
    return NextResponse.json({
      data: {
        id: attachment.id,
        url,
        mimeType: attachment.mime_type,
        size: attachment.size,
        expiresInSeconds: 300,
      },
    })
  }

  const sourceUrl = attachment.storage_key
    ? await CloudStorage.getSignedDownloadUrl(attachment.storage_key, 120)
    : attachment.storage_url

  const upstream = await fetch(sourceUrl!, { method: "GET" })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Unable to fetch attachment", code: "FETCH_FAILED" }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": attachment.mime_type,
      "content-length": String(attachment.size),
      "cache-control": "private, max-age=60",
      "content-disposition": `inline; filename="attachment-${attachment.id}"`,
    },
  })
}
