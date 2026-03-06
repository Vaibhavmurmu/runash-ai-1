import {
  editorRenderJobCreateRequestSchema,
  liveStreamCreateRequestSchema,
  mediaUploadFinalizeRequestSchema,
  mediaUploadInitRequestSchema,
} from "@/lib/api/contracts"

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : payload?.error?.message || "Request failed"
    throw new Error(message)
  }

  return payload
}

export async function createRenderJobV1(input: unknown, signal?: AbortSignal) {
  const parsed = editorRenderJobCreateRequestSchema.parse(input)
  const response = await fetch("/api/v1/editor/render-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(parsed),
  })

  return readJson(response)
}

export async function initMediaUploadV1(input: unknown) {
  const parsed = mediaUploadInitRequestSchema.parse(input)
  const response = await fetch("/api/v1/media/uploads/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return readJson(response)
}

export async function finalizeMediaUploadV1(assetId: string, input: unknown) {
  const parsed = mediaUploadFinalizeRequestSchema.parse(input)
  const response = await fetch(`/api/v1/media/uploads/${assetId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return readJson(response)
}

export async function createLiveStreamSessionV1(input: unknown) {
  const parsed = liveStreamCreateRequestSchema.parse(input)
  const response = await fetch("/api/v1/live-stream/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return readJson(response)
}
