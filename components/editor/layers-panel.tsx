"use client"

import { Button } from "@/components/ui/button"

const mockLayers = [
  { id: "layer-video", name: "Video base", group: "Primary", visible: true },
  { id: "layer-text", name: "Title overlay", group: "Overlays", visible: true },
  { id: "layer-audio", name: "Music bed", group: "Audio", visible: false },
]

export default function LayersPanel() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Layer management</h3>
        <p className="text-xs text-muted-foreground">Review layer visibility, ordering, and grouping for the active timeline.</p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        {mockLayers.map((layer, index) => (
          <div key={layer.id} className="rounded-md border border-border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{layer.name}</p>
                <p className="text-xs text-muted-foreground">Group: {layer.group}</p>
              </div>
              <span className="text-xs rounded-full border border-border px-2 py-1">{layer.visible ? "Visible" : "Hidden"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline">Toggle</Button>
              <Button size="sm" variant="outline" disabled={index === 0}>Move up</Button>
              <Button size="sm" variant="outline" disabled={index === mockLayers.length - 1}>Move down</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grouping</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">Create group</Button>
          <Button variant="outline" size="sm">Ungroup selected</Button>
        </div>
      </div>
    </div>
  )
}
