"use client"

import { Button } from "@/components/ui/button"
import { useEditorPanelContext } from "./editor-panel-context"

export interface LayerItem {
  id: string
  name: string
  group: string
  visible: boolean
}

export interface LayersPanelProps {
  layers: LayerItem[]
  onLayersChange: (nextLayers: LayerItem[]) => void
}

export const DEFAULT_LAYERS_PANEL_STATE: LayerItem[] = [
  { id: "layer-video", name: "Video base", group: "Primary", visible: true },
  { id: "layer-text", name: "Title overlay", group: "Overlays", visible: true },
  { id: "layer-audio", name: "Music bed", group: "Audio", visible: false },
]

export default function LayersPanel({ layers, onLayersChange }: LayersPanelProps) {
  const { activeTimeline, project } = useEditorPanelContext()

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
                onClick={() =>
                  onLayersChange(layers.map((item) => (item.id === layer.id ? { ...item, visible: !item.visible } : item)))
                }
              >
                Toggle
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={index === 0}
                onClick={() => {
                  if (index === 0) return
                  const next = [...layers]
                  const temp = next[index - 1]
                  next[index - 1] = next[index]
                  next[index] = temp
                  onLayersChange(next)
                }}
              >
                Move up
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={index === layers.length - 1}
                onClick={() => {
                  if (index === layers.length - 1) return
                  const next = [...layers]
                  const temp = next[index + 1]
                  next[index + 1] = next[index]
                  next[index] = temp
                  onLayersChange(next)
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
