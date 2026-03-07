"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function EditPanel() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Editing controls</h3>
        <p className="text-xs text-muted-foreground">Adjust segment-level and track-level controls before exporting.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segment-level controls</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="edit-trim-start" className="text-xs font-medium text-muted-foreground">
              Trim start (s)
            </label>
            <Input id="edit-trim-start" type="number" min={0} step={0.1} defaultValue={0} />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-trim-end" className="text-xs font-medium text-muted-foreground">
              Trim end (s)
            </label>
            <Input id="edit-trim-end" type="number" min={0} step={0.1} defaultValue={8} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">Split at playhead</Button>
          <Button variant="outline" size="sm">Add transition</Button>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Track-level controls</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="edit-track-volume" className="text-xs font-medium text-muted-foreground">
              Track volume
            </label>
            <Input id="edit-track-volume" type="number" min={0} max={200} step={1} defaultValue={100} />
          </div>
          <div className="space-y-2">
            <label htmlFor="edit-playback-rate" className="text-xs font-medium text-muted-foreground">
              Playback rate
            </label>
            <select
              id="edit-playback-rate"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              defaultValue="1"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">Normalize audio</Button>
          <Button variant="outline" size="sm">Lock selected track</Button>
        </div>
      </div>
    </div>
  )
}
