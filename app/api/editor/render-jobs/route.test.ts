import assert from "node:assert/strict"
import test from "node:test"

import { buildInvalidRequestError, editorRenderJobCreateRequestSchema } from "@/lib/api/contracts"

test("POST /api/editor/render-jobs returns INVALID_REQUEST for malformed JSON fallback payload", () => {
  const parsed = editorRenderJobCreateRequestSchema.safeParse({})
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "projectId"))
})

test("POST /api/editor/render-jobs returns INVALID_REQUEST for missing required fields", () => {
  const parsed = editorRenderJobCreateRequestSchema.safeParse({ payload: { modelId: "wan-2.1" } })
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "projectId"))
})

test("POST /api/editor/render-jobs returns INVALID_REQUEST for wrong field types", () => {
  const parsed = editorRenderJobCreateRequestSchema.safeParse({ projectId: 42 })
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "projectId"))
})
