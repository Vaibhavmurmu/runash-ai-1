"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Play, Download, Trash2, Edit, Share2, Clock, Eye, FileVideo, Scissors } from "lucide-react"
import Image from "next/image"
import type { RecordedStream } from "@/types/recording"
import type { LibraryQueryParams } from "@/lib/recording-service"

interface RecordedStreamsLibraryProps {
  streams: RecordedStream[]
  query: LibraryQueryParams
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onQueryChange: (query: LibraryQueryParams) => void
  onLoadMore: () => void
  onPlay: (stream: RecordedStream) => void
  onEdit: (stream: RecordedStream) => void
  onDelete: (streamId: string) => void
  onDownload: (stream: RecordedStream) => void
  onShare: (stream: RecordedStream) => void
  onCreateClip: (stream: RecordedStream) => void
}

export default function RecordedStreamsLibrary({
  streams,
  query,
  isLoading,
  isLoadingMore,
  hasMore,
  onQueryChange,
  onLoadMore,
  onPlay,
  onEdit,
  onDelete,
  onDownload,
  onShare,
  onCreateClip,
}: RecordedStreamsLibraryProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatPlatform = (platforms: string[]) => {
    if (platforms.length === 0) return "Unknown"
    return platforms.join(", ")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">Recorded Streams</h2>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search recordings..."
              className="pl-9"
              value={query.search ?? ""}
              onChange={(e) => onQueryChange({ ...query, search: e.target.value, page: 1 })}
            />
          </div>
          <Select
            value={query.sort ?? "date-desc"}
            onValueChange={(value) =>
              onQueryChange({ ...query, sort: value as LibraryQueryParams["sort"], page: 1 })
            }
          >
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest</SelectItem>
              <SelectItem value="date-asc">Oldest</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              <SelectItem value="views-desc">Most viewed</SelectItem>
              <SelectItem value="views-asc">Least viewed</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={query.platform ?? "all"}
            onValueChange={(value) => onQueryChange({ ...query, platform: value, page: 1 })}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="twitch">Twitch</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Select value={query.status ?? "all"} onValueChange={(value) => onQueryChange({ ...query, status: value, page: 1 })}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={query.segment ?? "recent"} onValueChange={(value) => onQueryChange({ ...query, segment: value as LibraryQueryParams["segment"], page: 1 })}>
        <TabsList>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="latest">Latest</TabsTrigger>
          <TabsTrigger value="previous">Previous</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="h-72 animate-pulse" />
          ))}
        </div>
      ) : streams.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">No recordings match these filters.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {streams.map((stream) => (
              <Card key={`${stream.sourceType}-${stream.id}`} className="overflow-hidden">
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                  {stream.thumbnailUrl ? (
                    <Image
                      src={stream.thumbnailUrl || "/placeholder.svg"}
                      alt={stream.title}
                      fill
                      style={{ objectFit: "cover" }}
                      className="transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileVideo className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2 flex gap-2">
                    <Badge variant="secondary">{stream.sourceType ?? "recording"}</Badge>
                    <Badge variant={stream.isProcessing ? "destructive" : "outline"}>{stream.status ?? "completed"}</Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                    {formatDuration(stream.duration)}
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-lg">{stream.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-2 pb-2">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      <span>{formatDate(stream.createdAt)}</span>
                    </div>
                    <div className="flex items-center">
                      <Eye className="mr-1 h-3 w-3" />
                      <span>{stream.viewCount} views</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">Platform: {formatPlatform(stream.platforms)}</div>
                </CardContent>

                <CardFooter className="flex justify-between pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90"
                      onClick={() => onPlay(stream)}
                      disabled={stream.isProcessing}
                    >
                      <Play className="mr-1 h-4 w-4" />
                      Play
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onShare(stream)} disabled={stream.isProcessing}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDownload(stream)} disabled={stream.isProcessing}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit(stream)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateClip(stream)} disabled={stream.isProcessing}>
                        <Scissors className="mr-2 h-4 w-4" />
                        Create clip
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(stream.id)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
