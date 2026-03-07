"use client"

import { Button } from "@/components/ui/button"
import type { EditorTimeline, EditorTrack } from "@/lib/editor/domain"
import { useEditorPanelContext } from "./editor-panel-context"

export interface LayerItem {
  id: string
  name: string
  group: string
  visible: boolean
}

function readVisibleFlag(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) return true
  return metadata.visible !== false
}

function sortedTracks(tracks: EditorTrack[]): EditorTrack[] {
  return [...tracks].sort((a, b) => a.orderIndex - b.orderIndex)
}

export function deriveLayerItemsFromTimeline(timeline?: EditorTimeline): LayerItem[] {
  if (!timeline) return []

  return sortedTracks(timeline.tracks).map((track) => {
    const segmentsOnTrack = timeline.segments.filter((segment) => segment.trackId === track.id)
    const isTrackVisible = readVisibleFlag(track.metadata)
    const areSegmentsVisible = segmentsOnTrack.every((segment) => readVisibleFlag(segment.metadata))

    return {
      id: track.id,
      name: track.label,
      group: track.trackType,
      visible: isTrackVisible && areSegmentsVisible,
    }
  })
}

export function toggleLayerVisibility(timeline: EditorTimeline, trackId: string): EditorTimeline {
  const track = timeline.tracks.find((item) => item.id === trackId)
  if (!track) return timeline

  const segmentsOnTrack = timeline.segments.filter((segment) => segment.trackId === trackId)
  const currentlyVisible = readVisibleFlag(track.metadata) && segmentsOnTrack.every((segment) => readVisibleFlag(segment.metadata))
  const nextVisible = !currentlyVisible

  return {
    ...timeline,
    tracks: timeline.tracks.map((item) =>
      item.id === trackId ? { ...item, metadata: { ...item.metadata, visible: nextVisible } } : item,
    ),
    segments: timeline.segments.map((segment) =>
      segment.trackId === trackId ? { ...segment, metadata: { ...segment.metadata, visible: nextVisible } } : segment,
    ),
  }
}

export function moveLayer(timeline: EditorTimeline, trackId: string, direction: "up" | "down"): EditorTimeline {
  const ordered = sortedTracks(timeline.tracks)
  const currentIndex = ordered.findIndex((track) => track.id === trackId)
  if (currentIndex === -1) return timeline

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= ordered.length) return timeline

  const nextOrdered = [...ordered]
  const temp = nextOrdered[targetIndex]
  nextOrdered[targetIndex] = nextOrdered[currentIndex]
  nextOrdered[currentIndex] = temp

  const normalized = nextOrdered.map((track, index) => ({ ...track, orderIndex: index }))

  return {
    ...timeline,
    tracks: normalized,
  }
}

export default function LayersPanel() {
  const { activeTimeline, project, onTimelineChange } = useEditorPanelContext()
  const layers = deriveLayerItemsFromTimeline(activeTimeline)

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Layer management</h3>
        <p className="text-xs text-muted-foreground">Review layer visibility, ordering, and grouping for the active timeline.</p>
        <p className="text-xs text-muted-foreground">
          Project: {project?.name ?? "No project"} · Timeline: {activeTimeline?.name ?? "No active timeline"}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        {layers.map((layer, index) => (
          <div key={layer.id} className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{layer.name}</p>
                <p className="text-xs text-muted-foreground">Group: {layer.group}</p>
              </div>
              <span className="rounded-full border border-border px-2 py-1 text-xs">{layer.visible ? "Visible" : "Hidden"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!activeTimeline}
                onClick={() => {
                  if (!activeTimeline) return
                  onTimelineChange(toggleLayerVisibility(activeTimeline, layer.id))
                }}
              >
                Toggle
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!activeTimeline || index === 0}
                onClick={() => {
                  if (!activeTimeline) return
                  onTimelineChange(moveLayer(activeTimeline, layer.id, "up"))
                }}
              >
                Move up
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!activeTimeline || index === layers.length - 1}
                onClick={() => {
                  if (!activeTimeline) return
                  onTimelineChange(moveLayer(activeTimeline, layer.id, "down"))
                }}
              >
                Move down
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grouping</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            Create group
          </Button>
          <Button variant="outline" size="sm">
            Ungroup selected
          </Button>
        </div>
      </div>
    </div>
  )
}
