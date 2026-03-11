import assert from "node:assert/strict"
import test from "node:test"

import { resolveMediaInsertionDuration, resolveMediaInsertionPlacement } from "@/lib/editor/media-insertion"

test("resolveMediaInsertionDuration prefers metadata for video", () => {
  const result = resolveMediaInsertionDuration({
    isVideoAsset: true,
    metadataDurations: [null, "5.5", 3],
  })

  assert.equal(result.durationSeconds, 5.5)
  assert.equal(result.durationStrategy, "video_metadata")
})

test("resolveMediaInsertionDuration uses image fallback for images", () => {
  const result = resolveMediaInsertionDuration({
    isVideoAsset: false,
  })

  assert.equal(result.durationSeconds, 3)
  assert.equal(result.durationStrategy, "image_fallback")
})

test("resolveMediaInsertionPlacement uses playhead when available and non-overlapping", () => {
  const result = resolveMediaInsertionPlacement({
    segments: [
      {
        id: "seg_1",
        projectId: "project_1",
        timelineId: "timeline_1",
        ownerId: "owner_1",
        trackId: "track_1",
        assetId: "asset_1",
        label: "segment",
        segmentType: "video",
        startSeconds: 0,
        endSeconds: 2,
        metadata: {},
        createdAt: "now",
        updatedAt: "now",
      },
    ],
    trackId: "track_1",
    durationSeconds: 3,
    playheadSeconds: 3,
    allowOverlaps: false,
  })

  assert.equal(result.insertionSource, "playhead")
  assert.equal(result.insertionStartSeconds, 3)
  assert.equal(result.insertionEndSeconds, 6)
})

test("resolveMediaInsertionPlacement falls back to track end when overlap mode is disabled", () => {
  const result = resolveMediaInsertionPlacement({
    segments: [
      {
        id: "seg_1",
        projectId: "project_1",
        timelineId: "timeline_1",
        ownerId: "owner_1",
        trackId: "track_1",
        assetId: "asset_1",
        label: "segment",
        segmentType: "video",
        startSeconds: 1,
        endSeconds: 6,
        metadata: {},
        createdAt: "now",
        updatedAt: "now",
      },
    ],
    trackId: "track_1",
    durationSeconds: 3,
    playheadSeconds: 2,
    allowOverlaps: false,
  })

  assert.equal(result.insertionSource, "track_end")
  assert.equal(result.insertionStartSeconds, 6)
  assert.equal(result.insertionEndSeconds, 9)
})
