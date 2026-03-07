import assert from "node:assert/strict"
import test from "node:test"

import {
  buildInvalidRequestError,
  editorAssetCreateRequestSchema,
  editorRenderJobCreateRequestSchema,
  editorSegmentCreateRequestSchema,
} from "@/lib/api/contracts"

test("POST /api/editor/projects/[projectId]/assets validation errors are normalized", () => {
  const malformed = editorAssetCreateRequestSchema.safeParse({})
  assert.equal(malformed.success, false)
  assert.equal(buildInvalidRequestError(malformed.error).code, "INVALID_REQUEST")

  const missing = editorAssetCreateRequestSchema.safeParse({ mimeType: "video/mp4" })
  assert.equal(missing.success, false)
  assert.ok(buildInvalidRequestError(missing.error).details.issues.some((issue) => issue.path === "storageKey"))

  const wrongType = editorAssetCreateRequestSchema.safeParse({ storageKey: "a.mp4", sizeBytes: "1000" })
  assert.equal(wrongType.success, false)
  assert.ok(buildInvalidRequestError(wrongType.error).details.issues.some((issue) => issue.path === "sizeBytes"))
})

test("POST /api/editor/projects/[projectId]/segments validation errors are normalized", () => {
  const malformed = editorSegmentCreateRequestSchema.safeParse({})
  assert.equal(malformed.success, false)
  assert.equal(buildInvalidRequestError(malformed.error).code, "INVALID_REQUEST")

  const missing = editorSegmentCreateRequestSchema.safeParse({ timelineId: "timeline-1" })
  assert.equal(missing.success, false)
  assert.ok(buildInvalidRequestError(missing.error).details.issues.some((issue) => issue.path === "trackId"))

  const wrongType = editorSegmentCreateRequestSchema.safeParse({ timelineId: "timeline-1", trackId: "track-1", startSeconds: "0" })
  assert.equal(wrongType.success, false)
  assert.ok(buildInvalidRequestError(wrongType.error).details.issues.some((issue) => issue.path === "startSeconds"))
})

test("POST /api/editor/render-jobs validation errors are normalized", () => {
  const malformed = editorRenderJobCreateRequestSchema.safeParse({})
  assert.equal(malformed.success, false)
  assert.equal(buildInvalidRequestError(malformed.error).code, "INVALID_REQUEST")

  const missing = editorRenderJobCreateRequestSchema.safeParse({ payload: { modelId: "wan-2.1" } })
  assert.equal(missing.success, false)
  assert.ok(buildInvalidRequestError(missing.error).details.issues.some((issue) => issue.path === "projectId"))

  const wrongType = editorRenderJobCreateRequestSchema.safeParse({ projectId: 42 })
  assert.equal(wrongType.success, false)
  assert.ok(buildInvalidRequestError(wrongType.error).details.issues.some((issue) => issue.path === "projectId"))
})
