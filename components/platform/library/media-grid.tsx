"use client"

import { useState } from "react"
import { MoreVertical, Download, Share2, Trash2, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MediaItem {
  id: number
  name: string
  type: string
  size: string
  duration: string
  date: string
  thumbnail: string
}

interface MediaGridProps {
  items: MediaItem[]
  viewMode: "grid" | "list"
}

export default function MediaGrid({ items, viewMode }: MediaGridProps) {
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [openMenu, setOpenMenu] = useState<number | null>(null)

  const toggleSelect = (id: number) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  if (viewMode === "list") {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                <input type="checkbox" className="w-4 h-4" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Size</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="px-4 py-3 text-sm">{item.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.size}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.duration}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenu === item.id && (
                    <div className="absolute right-4 mt-1 bg-card border border-border rounded-lg shadow-lg z-10">
                      {[
                        { icon: Edit3, label: "Edit", action: "edit" },
                        { icon: Download, label: "Download", action: "download" },
                        { icon: Share2, label: "Share", action: "share" },
                        { icon: Trash2, label: "Delete", action: "delete" },
                      ].map((action) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={action.action}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                          >
                            <Icon className="h-4 w-4" />
                            {action.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => toggleSelect(item.id)}
          className={cn(
            "bg-card border-2 rounded-lg overflow-hidden cursor-pointer transition-all hover:border-primary",
            selectedItems.includes(item.id) ? "border-primary" : "border-border",
          )}
        >
          {/* Thumbnail */}
          <div className={cn("aspect-video", item.thumbnail)} />

          {/* Info */}
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.size}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenu(openMenu === item.id ? null : item.id)
                }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {item.duration !== "-" && <p className="text-xs text-muted-foreground">{item.duration}</p>}

            {/* Actions Menu */}
            {openMenu === item.id && (
              <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border">
                {[
                  { icon: Edit3, label: "Edit" },
                  { icon: Download, label: "Download" },
                  { icon: Share2, label: "Share" },
                  { icon: Trash2, label: "Delete" },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                    >
                      <Icon className="h-3 w-3" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
