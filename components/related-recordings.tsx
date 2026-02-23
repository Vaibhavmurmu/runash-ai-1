import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Eye } from "lucide-react"

interface RelatedRecordingsProps {
  currentId: string
}

export default function RelatedRecordings({ currentId }: RelatedRecordingsProps) {
  // Mock data - in a real app, this would come from an API
  const recordings = [
    {
      id: "rec-002",
      title: "Smart Home Automation Workshop",
      host: {
        name: "HomeConnect",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "HC",
      },
      thumbnail: "/placeholder.svg?height=120&width=200",
      duration: 3600, // 1h in seconds
      views: 8200,
      date: "Apr 28, 2025",
    },
    {
      id: "rec-003",
      title: "Gaming Peripherals Showcase",
      host: {
        name: "GamersHub",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "GH",
      },
      thumbnail: "/placeholder.svg?height=120&width=200",
      duration: 4500, // 1h 15m in seconds
      views: 9800,
      date: "Apr 25, 2025",
    },
    {
      id: "rec-004",
      title: "Wearable Tech Trends 2025",
      host: {
        name: "TechStyle",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "TS",
      },
      thumbnail: "/placeholder.svg?height=120&width=200",
      duration: 2700, // 45m in seconds
      views: 6400,
      date: "Apr 22, 2025",
    },
    {
      id: "rec-005",
      title: "Budget Tech Essentials Review",
      host: {
        name: "TechValue",
        avatar: "/placeholder.svg?height=40&width=40",
        initials: "TV",
      },
      thumbnail: "/placeholder.svg?height=120&width=200",
      duration: 3300, // 55m in seconds
      views: 5100,
      date: "Apr 20, 2025",
    },
  ]

  // Filter out the current recording
  const filteredRecordings = recordings.filter((rec) => rec.id !== currentId)

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
    <div className="space-y-4">
      {filteredRecordings.map((recording) => (
        <Link key={recording.id} href={`/recordings/${recording.id}`}>
          <Card className="overflow-hidden transition-all hover:shadow-md">
            <CardContent className="p-3">
              <div className="flex gap-3">
                <div className="relative h-24 w-40 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={recording.thumbnail || "/placeholder.svg"}
                    alt={recording.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-xs text-white">
                    {formatDuration(recording.duration)}
                  </div>
                </div>

                <div className="flex flex-1 flex-col">
                  <h3 className="mb-1 line-clamp-2 text-sm font-medium">{recording.title}</h3>

                  <div className="mt-auto space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={recording.host.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-[8px]">{recording.host.initials}</AvatarFallback>
                      </Avatar>
                      <span>{recording.host.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {formatViews(recording.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {recording.date}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
