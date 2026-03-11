import assert from "node:assert/strict"
import test from "node:test"

import { buildInvalidRequestError, editorSegmentCreateRequestSchema } from "@/lib/api/contracts"

test("POST /api/editor/projects/:projectId/segments returns INVALID_REQUEST for malformed JSON fallback payload", () => {
  const parsed = editorSegmentCreateRequestSchema.safeParse({})
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "timelineId"))
})

test("POST /api/editor/projects/:projectId/segments returns INVALID_REQUEST for missing required fields", () => {
  const parsed = editorSegmentCreateRequestSchema.safeParse({ timelineId: "timeline-1" })
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "trackId"))
})

test("POST /api/editor/projects/:projectId/segments returns INVALID_REQUEST for wrong field types", () => {
  const parsed = editorSegmentCreateRequestSchema.safeParse({ timelineId: "timeline-1", trackId: "track-1", startSeconds: "0" })
  assert.equal(parsed.success, false)

  const payload = buildInvalidRequestError(parsed.error)
  assert.equal(payload.code, "INVALID_REQUEST")
  assert.ok(payload.details.issues.some((issue) => issue.path === "startSeconds"))
})
