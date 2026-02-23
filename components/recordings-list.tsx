"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Bookmark, Clock, Download, Eye } from "lucide-react"
import DownloadButton from "@/components/download-button"

interface RecordingsListProps {
  category: "all" | "watched" | "saved" | "your" | "downloads"
}

export default function RecordingsList({ category }: RecordingsListProps) {
  // Mock data - in a real app, this would come from an API
  const recordings = [
    {
      id: "rec-001",
      title: "Tech Showcase 2025: The Future of AI",
      host: {
        name: "TechConnect",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "TC",
      },
      thumbnail: "/placeholder.svg?height=200&width=360",
      duration: 5400, // 1h 30m in seconds
      views: 12500,
      date: "May 1, 2025",
      tags: ["Tech", "AI", "Showcase"],
      saved: true,
      watched: 0.7, // 70% watched
      downloaded: true,
      downloadQuality: "HD (1080p)",
    },
    {
      id: "rec-002",
      title: "Smart Home Automation Workshop",
      host: {
        name: "HomeConnect",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "HC",
      },
      thumbnail: "/placeholder.svg?height=200&width=360",
      duration: 3600, // 1h in seconds
      views: 8200,
      date: "Apr 28, 2025",
      tags: ["Smart Home", "IoT", "Workshop"],
      saved: false,
      watched: 1, // 100% watched
      downloaded: false,
    },
    {
      id: "rec-003",
      title: "Gaming Peripherals Showcase",
      host: {
        name: "GamersHub",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "GH",
      },
      thumbnail: "/placeholder.svg?height=200&width=360",
      duration: 4500, // 1h 15m in seconds
      views: 9800,
      date: "Apr 25, 2025",
      tags: ["Gaming", "Hardware", "Review"],
      saved: true,
      watched: 0.3, // 30% watched
      downloaded: true,
      downloadQuality: "SD (720p)",
    },
    {
      id: "rec-004",
      title: "Wearable Tech Trends 2025",
      host: {
        name: "TechStyle",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "TS",
      },
      thumbnail: "/placeholder.svg?height=200&width=360",
      duration: 2700, // 45m in seconds
      views: 6400,
      date: "Apr 22, 2025",
      tags: ["Wearables", "Fashion Tech", "Trends"],
      saved: false,
      watched: 0, // Not watched
      downloaded: false,
    },
  ]

  // Filter recordings based on category
  const filteredRecordings = recordings.filter((rec) => {
    if (category === "all") return true
    if (category === "watched") return rec.watched > 0
    if (category === "saved") return rec.saved
    if (category === "downloads") return rec.downloaded
    if (category === "your") return false // In a real app, this would filter for the user's own recordings
    return true
  })

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Format views
  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredRecordings.length > 0 ? (
        filteredRecordings.map((recording) => (
          <Card key={recording.id} className="overflow-hidden transition-all hover:shadow-md">
            <Link href={`/recordings/${recording.id}`}>
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={recording.thumbnail || "/placeholder.svg"}
                  alt={recording.title}
                  className="h-full w-full object-cover"
                />

                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                  {formatDuration(recording.duration)}
                </div>

                {/* Watch progress */}
                {recording.watched > 0 && recording.watched < 1 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                    <div className="h-full bg-orange-500" style={{ width: `${recording.watched * 100}%` }} />
                  </div>
                )}

                {/* Watched badge */}
                {recording.watched === 1 && (
                  <Badge className="absolute top-2 left-2 bg-zinc-800/80 backdrop-blur-sm">Watched</Badge>
                )}

                {/* Downloaded badge */}
                {recording.downloaded && (
                  <Badge className="absolute top-2 left-2 bg-green-600/80 backdrop-blur-sm flex items-center gap-1">
                    <Download className="h-3 w-3" /> {recording.downloadQuality}
                  </Badge>
                )}

                {/* Saved badge */}
                {recording.saved && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/40"
                    onClick={(e) => {
                      e.preventDefault()
                      // Toggle saved status logic would go here
                    }}
                  >
                    <Bookmark className="h-4 w-4 fill-current" />
                  </Button>
                )}
              </div>
            </Link>

            <CardContent className="p-4">
              <Link href={`/recordings/${recording.id}`}>
                <h3 className="mb-2 line-clamp-2 font-medium">{recording.title}</h3>

                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={recording.host.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                      {recording.host.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{recording.host.name}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {formatViews(recording.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {recording.date}
                  </span>
                </div>
              </Link>

              <div className="mt-3 flex justify-end">
                <DownloadButton
                  recordingId={recording.id}
                  recordingTitle={recording.title}
                  size="sm"
                  variant={recording.downloaded ? "secondary" : "outline"}
                  className={
                    recording.downloaded ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : ""
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-medium">No recordings found</h3>
          <p className="text-muted-foreground">
            {category === "watched" && "You haven't watched any recordings yet."}
            {category === "saved" && "You haven't saved any recordings yet."}
            {category === "downloads" && "You haven't downloaded any recordings yet."}
            {category === "your" && "You haven't created any recordings yet."}
            {category === "all" && "No recordings are available at the moment."}
          </p>
        </div>
      )}
    </div>
  )
}
