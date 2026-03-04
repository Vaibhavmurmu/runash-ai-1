"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Users, Heart, Clock } from "lucide-react"

export default function LiveStreamsGrid() {
  const [likedStreams, setLikedStreams] = useState<number[]>([])

  const liveStreams = [
    {
      id: 1,
      title: "Gaming Peripherals Showcase",
      host: "GamersHub",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 892,
      category: "Gaming",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "2h 15m",
      likes: 234,
    },
    {
      id: 2,
      title: "Smart Home Automation",
      host: "HomeConnect",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 567,
      category: "Smart Home",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "1h 45m",
      likes: 189,
    },
    {
      id: 3,
      title: "Latest Smartphone Reviews",
      host: "TechReviews",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 1234,
      category: "Mobile",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "3h 20m",
      likes: 456,
    },
    {
      id: 4,
      title: "Audio Equipment Deep Dive",
      host: "AudioPro",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 445,
      category: "Audio",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "1h 30m",
      likes: 167,
    },
  ]

  const toggleLike = (streamId: number) => {
    setLikedStreams((prev) => (prev.includes(streamId) ? prev.filter((id) => id !== streamId) : [...prev, streamId]))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Now</h2>
          <p className="text-muted-foreground">Join the conversation and shop live</p>
        </div>
        <Link href="/streams" className="text-orange-500 hover:text-orange-600 font-medium">
          View All Streams →
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {liveStreams.map((stream) => (
          <Card key={stream.id} className="group overflow-hidden">
            <div className="relative">
              <Link href={`/streams/${stream.id}`}>
                <div className="aspect-video overflow-hidden">
                  <img
                    src={stream.thumbnail || "/placeholder.svg"}
                    alt={stream.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
              </Link>

              {/* Live Badge */}
              <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600">
                <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-white"></div>
                LIVE
              </Badge>

              {/* Duration */}
              <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                <Clock className="mr-1 h-3 w-3" />
                {stream.duration}
              </Badge>

              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="icon" className="h-12 w-12 rounded-full bg-white/90 hover:bg-white">
                  <Play className="h-6 w-6 text-black" />
                </Button>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{stream.category}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {stream.viewers.toLocaleString()}
                  </div>
                </div>

                <Link href={`/streams/${stream.id}`}>
                  <h3 className="font-medium line-clamp-2 hover:text-orange-500 transition-colors">{stream.title}</h3>
                </Link>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={stream.hostAvatar || "/placeholder.svg"} />
                      <AvatarFallback>{stream.host.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{stream.host}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleLike(stream.id)}>
                      <Heart
                        className={`h-4 w-4 ${
                          likedStreams.includes(stream.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {stream.likes + (likedStreams.includes(stream.id) ? 1 : 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
