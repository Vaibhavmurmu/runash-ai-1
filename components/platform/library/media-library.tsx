"use client"

import { useState } from "react"
import { Upload, Grid, List, Search, Trash2, Download, Share2 } from "lucide-react"
import MediaGrid from "./media-grid"
import UploadZone from "./upload-zone"
import { cn } from "@/lib/utils"

export default function MediaLibrary() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "videos" | "images" | "trash">("all")
  const [showUpload, setShowUpload] = useState(false)

  const filters = [
    { id: "all", label: "All Files", count: 24 },
    { id: "videos", label: "Generated Videos", count: 12 },
    { id: "images", label: "Uploads", count: 8 },
    { id: "trash", label: "Trash", count: 4 },
  ]

  const mediaItems = [
    {
      id: 1,
      name: "Product Launch Video.mp4",
      type: "video",
      size: "245 MB",
      duration: "2:45",
      date: "Dec 5, 2024",
      thumbnail: "bg-blue-500",
    },
    {
      id: 2,
      name: "Tutorial Series.mp4",
      type: "video",
      size: "512 MB",
      duration: "15:30",
      date: "Dec 4, 2024",
      thumbnail: "bg-purple-500",
    },
    {
      id: 3,
      name: "Thumbnail Design.png",
      type: "image",
      size: "2.3 MB",
      duration: "-",
      date: "Dec 3, 2024",
      thumbnail: "bg-green-500",
    },
    {
      id: 4,
      name: "Background Music.mp3",
      type: "audio",
      size: "8.5 MB",
      duration: "3:22",
      date: "Dec 2, 2024",
      thumbnail: "bg-orange-500",
    },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Media Library</h1>
            <p className="text-muted-foreground mt-1">Manage your videos, images, and assets</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload Files
          </button>
        </div>

        {/* Upload Zone */}
        {showUpload && <UploadZone onClose={() => setShowUpload(false)} />}

        {/* Search and View Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media..."
              className="w-full pl-10 pr-3 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded transition-colors",
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/20",
              )}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded transition-colors",
                viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/20",
              )}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={cn(
                "px-4 py-2 rounded-lg whitespace-nowrap transition-colors",
                activeFilter === filter.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
              )}
            >
              {filter.label}
              <span className="ml-1 text-xs opacity-70">({filter.count})</span>
            </button>
          ))}
        </div>

        {/* Media Grid/List */}
        <MediaGrid items={mediaItems} viewMode={viewMode} />

        {/* Bulk Actions */}
        <div className="flex gap-2 p-4 bg-card border border-border rounded-lg">
          <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors">
            <Download className="h-4 w-4" />
            Download Selected
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors">
            <Share2 className="h-4 w-4" />
            Share Selected
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded text-sm transition-colors ml-auto">
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </button>
        </div>
      </div>
    </div>
  )
}
