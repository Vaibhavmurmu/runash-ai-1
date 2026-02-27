import assert from "node:assert/strict"
import test from "node:test"

import type { EditorAsset, EditorSegment, EditorTimeline, EditorTrack } from "@/lib/editor/domain"
import { compileTimelineToVideoGenerationRequest, TimelineCompilationError } from "@/lib/editor/generation/compile-timeline"

function makeTrack(partial?: Partial<EditorTrack>): EditorTrack {
  return {
    id: partial?.id ?? "track-1",
    timelineId: partial?.timelineId ?? "timeline-1",
    projectId: partial?.projectId ?? "project-1",
    ownerId: partial?.ownerId ?? "user-1",
    label: partial?.label ?? "Main",
    orderIndex: partial?.orderIndex ?? 0,
    trackType: partial?.trackType ?? "video",
    metadata: partial?.metadata ?? {},
    createdAt: partial?.createdAt ?? new Date(0).toISOString(),
    updatedAt: partial?.updatedAt ?? new Date(0).toISOString(),
  }
}

function makeSegment(partial?: Partial<EditorSegment>): EditorSegment {
  return {
    id: partial?.id ?? "segment-1",
    projectId: partial?.projectId ?? "project-1",
    timelineId: partial?.timelineId ?? "timeline-1",
    ownerId: partial?.ownerId ?? "user-1",
    trackId: partial?.trackId ?? "track-1",
    assetId: partial?.assetId ?? "asset-1",
    label: partial?.label ?? "Shot",
    segmentType: partial?.segmentType ?? "clip",
    startSeconds: partial?.startSeconds ?? 0,
    endSeconds: partial?.endSeconds ?? 1,
    metadata: partial?.metadata ?? {},
    createdAt: partial?.createdAt ?? new Date(0).toISOString(),
    updatedAt: partial?.updatedAt ?? new Date(0).toISOString(),
  }
}

function makeTimeline(partial?: Partial<EditorTimeline>): EditorTimeline {
  return {
    id: partial?.id ?? "timeline-1",
    projectId: partial?.projectId ?? "project-1",
    ownerId: partial?.ownerId ?? "user-1",
    name: partial?.name ?? "Main timeline",
    frameRate: partial?.frameRate ?? 30,
    durationSeconds: partial?.durationSeconds ?? 4,
    metadata: partial?.metadata ?? {},
    tracks: partial?.tracks ?? [makeTrack()],
    segments: partial?.segments ?? [makeSegment()],
    createdAt: partial?.createdAt ?? new Date(0).toISOString(),
    updatedAt: partial?.updatedAt ?? new Date(0).toISOString(),
  }
}

const assets: EditorAsset[] = [
  {
    id: "asset-1",
    projectId: "project-1",
    ownerId: "user-1",
    source: "upload",
    uploadFileId: "file-1",
    storageKey: "editor/asset-1.mp4",
    accessUrl: "https://cdn.example.com/editor/asset-1.mp4",
    mimeType: "video/mp4",
    sizeBytes: 123,
    metadata: {},
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
]

test("compiles timeline into normalized generation payload", () => {
  const timeline = makeTimeline({
    tracks: [makeTrack()],
    segments: [
      makeSegment({
        id: "segment-1",
        startSeconds: 0,
        endSeconds: 1.02,
        metadata: { prompt: "close up portrait", style: "cinematic lighting" },
      }),
      makeSegment({
        id: "segment-2",
        startSeconds: 1.02,
        endSeconds: 2,
        metadata: { negativePrompt: "blur" },
      }),
    ],
  })

  const compiled = compileTimelineToVideoGenerationRequest({
    timeline,
    assets,
    payload: { modelId: "wan-v1", fps: 24 },
  })

  assert.equal(compiled.request.fps, 24)
  assert.equal(compiled.shotList.length, 2)
  assert.equal(compiled.sourceAssets.length, 1)
  assert.equal(compiled.summary.shotCount, 2)
  assert.equal(compiled.request.prompt, "close up portrait | cinematic lighting")
  assert.equal(compiled.request.negativePrompt, "blur")
})

test("rejects unsupported overlapping segments", () => {
  const timeline = makeTimeline({
    segments: [
      makeSegment({ id: "segment-1", startSeconds: 0, endSeconds: 2 }),
      makeSegment({ id: "segment-2", startSeconds: 1.5, endSeconds: 3 }),
    ],
  })

  assert.throws(
    () => compileTimelineToVideoGenerationRequest({ timeline, assets, payload: { modelId: "wan-v1" } }),
    (error) => error instanceof TimelineCompilationError && error.code === "OVERLAP_UNSUPPORTED",
  )
})

test("allows gaps when enabled in track metadata", () => {
  const timeline = makeTimeline({
    tracks: [makeTrack({ metadata: { allowGaps: true } })],
    segments: [
      makeSegment({ id: "segment-1", startSeconds: 0, endSeconds: 1 }),
      makeSegment({ id: "segment-2", startSeconds: 2, endSeconds: 3 }),
    ],
  })

  const compiled = compileTimelineToVideoGenerationRequest({
    timeline,
    assets,
    payload: { modelId: "runway-v1" },
  })

  assert.equal(compiled.shotList.length, 2)
})
