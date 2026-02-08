"use client"

import { useState } from "react"
import { Scissors, Crop, Settings2, Zap, RefreshCw, Copy, Download, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface EditingToolbarProps {
  onApplyEdit: (edit: any) => void
}

export default function EditingToolbar({ onApplyEdit }: EditingToolbarProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const editTools = [
    { icon: Scissors, label: "Clip", id: "clip" },
    { icon: Crop, label: "Crop", id: "crop" },
    { icon: Settings2, label: "Adjust", id: "adjust" },
    { icon: Zap, label: "Effects", id: "effects" },
    { icon: RefreshCw, label: "Remix", id: "remix" },
  ]

  const presets = ["Professional", "Casual", "Energetic", "Cinematic"]

  const variations = [
    { name: "Original", duration: "2:00" },
    { name: "Short Form", duration: "0:30" },
    { name: "Story", duration: "1:00" },
  ]

  return (
    <div className="border border-border rounded-lg bg-card p-4 space-y-4">
      {/* Edit Tools */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Editing Tools</h3>
        <div className="flex gap-2 flex-wrap">
          {editTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                className="flex items-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors"
                onClick={() => onApplyEdit(tool.id)}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Presets */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Presets</h3>
        <div className="flex gap-2 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => setActivePreset(preset)}
              className={cn(
                "px-3 py-1 rounded text-sm transition-colors",
                activePreset === preset ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Variations */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Create Variations</h3>
        <div className="grid grid-cols-3 gap-2">
          {variations.map((variation, idx) => (
            <div
              key={idx}
              className="p-2 bg-muted rounded text-center cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <div className="text-sm font-medium">{variation.name}</div>
              <div className="text-xs text-muted-foreground">{variation.duration}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors">
          <ThumbsUp className="h-4 w-4" />
          Like
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors">
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-sm transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
    </div>
  )
}
