import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import LiveStreamPlayer from "@/components/live-stream-player"
import StreamProducts from "@/components/stream-products"
import RelatedRecordings from "@/components/related-recordings"
import DownloadButton from "@/components/download-button"
import { ArrowLeft, Bookmark, Calendar, Share2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Tech Showcase 2025: The Future of AI | RunAsh Recordings",
  description: "Watch the recorded Tech Showcase 2025 featuring the latest AI-powered gadgets and innovations.",
}

export default async function RecordingPage(props: { params: Promise<{ id: string }> }) {
  const { id: recordingId } = await props.params

  // Mock recording data - in a real app, this would come from an API
  const recording = {
    id: recordingId,
    title: "Tech Showcase 2025: The Future of AI",
    description:
      "Join us for an exclusive look at the latest AI-powered gadgets and innovations that will shape the future of technology. Our experts demonstrate cutting-edge products and answer viewer questions in this comprehensive showcase.",
    host: {
      name: "TechConnect",
      avatar: "/placeholder.svg?height=40&width=40",
      initials: "TC",
      followers: "245K",
    },
    duration: 5400, // 1h 30m in seconds
    views: 12500,
    date: "May 1, 2025",
    tags: ["Tech", "AI", "Showcase", "Smart Home", "Gadgets"],
    saved: true,
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/recordings" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Recordings
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <div className="w-full overflow-hidden rounded-xl bg-zinc-900 shadow-lg">
            <LiveStreamPlayer streamId={recordingId} isReplay={true} duration={recording.duration} currentTime={0} />
          </div>

          {/* Recording Info */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold sm:text-3xl">{recording.title}</h1>
              <div className="flex items-center gap-2">
                <DownloadButton recordingId={recordingId} recordingTitle={recording.title} />
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                  <Bookmark className={recording.saved ? "h-5 w-5 fill-current" : "h-5 w-5"} />
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>{recording.views.toLocaleString()} views</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> {recording.date}
              </span>
              <span>
                {Math.floor(recording.duration / 3600)}h {Math.floor((recording.duration % 3600) / 60)}m
              </span>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src={recording.host.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    {recording.host.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{recording.host.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{recording.host.followers} followers</p>
                </div>
              </div>

              <Button className="ml-auto bg-orange-500 hover:bg-orange-600">Follow</Button>
            </div>

            <p className="text-muted-foreground">{recording.description}</p>

            <div className="flex flex-wrap gap-2">
              {recording.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-zinc-100 dark:bg-zinc-800">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Featured Products */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Products Featured in This Recording</h2>
            <StreamProducts streamId={recordingId} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Related Recordings</h2>
            <RelatedRecordings currentId={recordingId} />
          </div>
        </div>
      </div>
    </main>
  )
}
