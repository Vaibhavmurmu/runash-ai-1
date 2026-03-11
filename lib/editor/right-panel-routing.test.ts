import test from "node:test"
import assert from "node:assert/strict"
import { renderPanelByTab, resolveRightPanelTab, updateTabPanelState } from "@/components/editor/right-panel"
import { DEFAULT_EDIT_PANEL_STATE } from "@/components/editor/panels/edit-panel"
import { deriveLayerItemsFromTimeline, moveLayer, toggleLayerVisibility } from "@/components/editor/panels/layers-panel"
import { RIGHT_PANEL_TABS } from "@/components/editor/panel-tabs"
import type { EditorSegment, EditorTimeline, EditorTrack } from "@/lib/editor/domain"

function makeTrack(partial: Partial<EditorTrack>): EditorTrack {
  return {
    id: partial.id ?? "track",
    timelineId: partial.timelineId ?? "timeline-1",
    projectId: partial.projectId ?? "project-1",
    ownerId: partial.ownerId ?? "owner-1",
    label: partial.label ?? "Track",
    orderIndex: partial.orderIndex ?? 0,
    trackType: partial.trackType ?? "video",
    metadata: partial.metadata ?? {},
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
  }
}

function makeSegment(partial: Partial<EditorSegment>): EditorSegment {
  return {
    id: partial.id ?? "segment",
    projectId: partial.projectId ?? "project-1",
    timelineId: partial.timelineId ?? "timeline-1",
    ownerId: partial.ownerId ?? "owner-1",
    trackId: partial.trackId ?? "track-1",
    assetId: partial.assetId ?? null,
    label: partial.label ?? "Segment",
    segmentType: partial.segmentType ?? "video",
    startSeconds: partial.startSeconds ?? 0,
    endSeconds: partial.endSeconds ?? 3,
    metadata: partial.metadata ?? {},
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
  }
}

function makeTimeline(partial?: Partial<EditorTimeline>): EditorTimeline {
  return {
    id: partial?.id ?? "timeline-1",
    projectId: partial?.projectId ?? "project-1",
    ownerId: partial?.ownerId ?? "owner-1",
    name: partial?.name ?? "Main timeline",
    frameRate: partial?.frameRate ?? 30,
    durationSeconds: partial?.durationSeconds ?? 12,
    metadata: partial?.metadata ?? {},
    tracks: partial?.tracks ?? [],
    segments: partial?.segments ?? [],
    version: partial?.version ?? 1,
    updatedBy: partial?.updatedBy ?? null,
    createdAt: partial?.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial?.updatedAt ?? "2026-01-01T00:00:00.000Z",
  }
}

test("resolveRightPanelTab falls back to generate for unknown ids", () => {
  assert.equal(resolveRightPanelTab("generate"), "generate")
  assert.equal(resolveRightPanelTab("edit"), "edit")
  assert.equal(resolveRightPanelTab("not-a-tab"), "generate")
  assert.equal(resolveRightPanelTab(undefined), "generate")
})

test("tab panel state is retained while switching tabs", () => {
  const initial = {
    edit: DEFAULT_EDIT_PANEL_STATE,
  }

  const editUpdated = updateTabPanelState(initial, "edit", {
    ...initial.edit,
    trimStart: "2.5",
    trackVolume: "73",
  })

  assert.equal(editUpdated.edit.trimStart, "2.5")
  assert.equal(editUpdated.edit.trackVolume, "73")
})

test("deriveLayerItemsFromTimeline and toggleLayerVisibility reflect track + segment visibility", () => {
  const timeline = makeTimeline({
    tracks: [
      makeTrack({ id: "track-2", label: "Text", orderIndex: 1, trackType: "overlay" }),
      makeTrack({ id: "track-1", label: "Base", orderIndex: 0, trackType: "primary" }),
    ],
    segments: [
      makeSegment({ id: "segment-1", trackId: "track-1", metadata: { visible: true } }),
      makeSegment({ id: "segment-2", trackId: "track-2", metadata: { visible: false } }),
    ],
  })

  const derived = deriveLayerItemsFromTimeline(timeline)
  assert.deepEqual(
    derived.map((item) => ({ id: item.id, visible: item.visible })),
    [
      { id: "track-1", visible: true },
      { id: "track-2", visible: false },
    ],
  )

  const toggled = toggleLayerVisibility(timeline, "track-2")
  assert.equal(toggled.tracks.find((track) => track.id === "track-2")?.metadata.visible, true)
  assert.equal(toggled.segments.find((segment) => segment.id === "segment-2")?.metadata.visible, true)
})

test("moveLayer updates array order and orderIndex consistently", () => {
  const timeline = makeTimeline({
    tracks: [
      makeTrack({ id: "track-1", orderIndex: 0, label: "A" }),
      makeTrack({ id: "track-2", orderIndex: 1, label: "B" }),
      makeTrack({ id: "track-3", orderIndex: 2, label: "C" }),
    ],
  })

  const moved = moveLayer(timeline, "track-2", "up")

  assert.deepEqual(
    moved.tracks.map((track) => ({ id: track.id, orderIndex: track.orderIndex })),
    [
      { id: "track-2", orderIndex: 0 },
      { id: "track-1", orderIndex: 1 },
      { id: "track-3", orderIndex: 2 },
    ],
  )
})


test("renderPanelByTab falls back to GeneratePanel for unknown tab ids", () => {
  const panel = renderPanelByTab(
    "unknown-tab",
    {
      selectedModel: "wan-2.1",
      onModelChange: () => undefined,
      generationConfig: {
        modelId: "wan-2.1",
        prompt: "",
        negativePrompt: "",
        durationPreset: "8s",
        durationSeconds: 8,
        aspectRatio: "16:9",
        resolution: "1280x720",
        fps: 24,
        qualityMode: "quality",
        seed: 0,
      },
      validationErrors: {},
      onGenerationConfigChange: () => undefined,
    },
    { edit: DEFAULT_EDIT_PANEL_STATE },
    () => undefined,
  )

  assert.equal(typeof panel.type, "function")
  assert.equal((panel.type as { name?: string }).name, "GeneratePanel")
})

test("RIGHT_PANEL_TABS ids and labels remain route-aligned", () => {
  assert.deepEqual(RIGHT_PANEL_TABS, [
    { id: "generate", label: "Generate" },
    { id: "edit", label: "Edit" },
    { id: "layers", label: "Layers" },
    { id: "stream", label: "Stream" },
  ])
})
