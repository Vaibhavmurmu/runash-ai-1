import assert from "node:assert/strict"
import test from "node:test"

import { buildInvalidRequestError, editorAssetCreateRequestSchema } from "@/lib/api/contracts"

test("POST /api/editor/projects/:projectId/assets returns INVALID_REQUEST for malformed JSON fallback payload", () => {
  const parsed = editorAssetCreateRequestSchema.safeParse({})
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "storageKey"))
})

test("POST /api/editor/projects/:projectId/assets returns INVALID_REQUEST for missing required fields", () => {
  const parsed = editorAssetCreateRequestSchema.safeParse({ mimeType: "video/mp4" })
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "storageKey"))
})

test("POST /api/editor/projects/:projectId/assets returns INVALID_REQUEST for wrong field types", () => {
  const parsed = editorAssetCreateRequestSchema.safeParse({ storageKey: "asset.mp4", sizeBytes: "1000" })
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "sizeBytes"))
})
