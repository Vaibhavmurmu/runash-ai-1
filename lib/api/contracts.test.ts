import test from "node:test"
import assert from "node:assert/strict"

import {
  editorProjectTimelineCreateRequestSchema,
  editorProjectTimelineReplaceRequestSchema,
  editorRenderJobCreateRequestSchema,
  liveStreamCreateRequestSchema,
  mediaUploadFinalizeRequestSchema,
  mediaUploadInitRequestSchema,
} from "@/lib/api/contracts"

test("live stream create contract remains compatible", () => {
  const parsed = liveStreamCreateRequestSchema.safeParse({
    workspaceId: "workspace-1",
    title: "Launch event",
    dvrEnabled: true,
    latencyProfile: "low",
  })

  assert.equal(parsed.success, true)
})

test("editor timeline create contract supports legacy version field", () => {
  const parsed = editorProjectTimelineCreateRequestSchema.safeParse({
    name: "Main timeline",
    frameRate: 30,
    durationSeconds: 120,
    metadata: { theme: "default" },
    version: 3,
  })

  assert.equal(parsed.success, true)
})

test("editor timeline replace contract requires timeline id", () => {
  const parsed = editorProjectTimelineReplaceRequestSchema.safeParse({
    timeline: {
      name: "Missing id",
    },
  })

  assert.equal(parsed.success, false)
})

test("editor render job contract validates required projectId", () => {
  const parsed = editorRenderJobCreateRequestSchema.safeParse({
    projectId: "project-123",
    payload: { modelId: "wan-2.1" },
  })

  assert.equal(parsed.success, true)
})

test("media upload init contract validates size and filename", () => {
  const parsed = mediaUploadInitRequestSchema.safeParse({
    mimeType: "video/mp4",
    sizeBytes: 1024,
    fileName: "clip.mp4",
    projectId: "project-1",
  })

  assert.equal(parsed.success, true)
})

test("media upload finalize contract rejects zero dimensions", () => {
  const parsed = mediaUploadFinalizeRequestSchema.safeParse({
    width: 0,
  })

  assert.equal(parsed.success, false)
})
