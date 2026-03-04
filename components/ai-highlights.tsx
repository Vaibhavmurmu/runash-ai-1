"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Play, Download, Clock, Tag, MessageSquare, ShoppingBag, Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import SocialShare from "@/components/social-share"

interface AIHighlightsProps {
  streamId: string
  streamTitle: string
}

interface Highlight {
  id: string
  title: string
  description: string
  timestamp: number // in seconds
  duration: number // in seconds
  thumbnail: string
  tags: string[]
  type: "product" | "moment" | "reaction" | "question"
  productId?: string
  productName?: string
  productPrice?: number
}

export default function AIHighlights({ streamId, streamTitle }: AIHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  // Fetch highlights
  useEffect(() => {
    const fetchHighlights = async () => {
      setLoading(true)

      // In a real app, this would be an API call
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock highlights data
      const mockHighlights: Highlight[] = [
        {
          id: "highlight-1",
          title: "Smart Home Hub Demo",
          description: "Detailed demonstration of the AI Smart Home Hub features and setup process",
          timestamp: 345, // 5:45
          duration: 120, // 2 minutes
          thumbnail: "/placeholder.svg?height=120&width=200",
          tags: ["demo", "smart home", "setup"],
          type: "product",
          productId: "prod-001",
          productName: "AI Smart Home Hub",
          productPrice: 129.99,
        },
        {
          id: "highlight-2",
          title: "Audience Reaction to Voice Control",
          description: "Amazing reaction when the presenter demonstrates the voice control capabilities",
          timestamp: 1230, // 20:30
          duration: 45, // 45 seconds
          thumbnail: "/placeholder.svg?height=120&width=200",
          tags: ["reaction", "voice control", "audience"],
          type: "reaction",
        },
        {
          id: "highlight-3",
          title: "Q&A: Battery Life Discussion",
          description: "Detailed answer about the battery life and power consumption of the smart devices",
          timestamp: 2760, // 46:00
          duration: 90, // 1.5 minutes
          thumbnail: "/placeholder.svg?height=120&width=200",
          tags: ["Q&A", "battery", "power"],
          type: "question",
        },
        {
          id: "highlight-4",
          title: "Wireless Earbuds Sound Test",
          description: "Live demonstration of the sound quality and noise cancellation features",
          timestamp: 1845, // 30:45
          duration: 180, // 3 minutes
          thumbnail: "/placeholder.svg?height=120&width=200",
          tags: ["demo", "audio", "test"],
          type: "product",
          productId: "prod-003",
          productName: "Wireless Earbuds Pro",
          productPrice: 149.99,
        },
        {
          id: "highlight-5",
          title: "Special Discount Announcement",
          description: "Announcement of limited-time discount for live viewers",
          timestamp: 3120, // 52:00
          duration: 60, // 1 minute
          thumbnail: "/placeholder.svg?height=120&width=200",
          tags: ["announcement", "discount", "offer"],
          type: "moment",
        },
      ]

      setHighlights(mockHighlights)
      setLoading(false)
    }

    fetchHighlights()
  }, [streamId])

  // Format timestamp (seconds to MM:SS)
  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Handle play highlight
  const playHighlight = (highlight: Highlight) => {
    // In a real app, this would seek to the timestamp in the video player
    toast({
      title: "Playing highlight",
      description: `Playing "${highlight.title}" at ${formatTimestamp(highlight.timestamp)}`,
    })
  }

  // Handle save highlight
  const saveHighlight = (highlight: Highlight) => {
    toast({
      title: "Highlight saved",
      description: `"${highlight.title}" has been saved to your collection`,
    })
  }

  // Filter highlights based on active tab
  const filteredHighlights =
    activeTab === "all" ? highlights : highlights.filter((highlight) => highlight.type === activeTab)

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <Skeleton className="aspect-video h-auto w-full sm:w-1/3" />
                <div className="flex-1 space-y-2 p-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">AI-Generated Highlights</h2>
        <SocialShare
          title={`Highlights from ${streamTitle}`}
          description="Check out these AI-generated highlights from the stream"
          url={`/streams/${streamId}`}
          variant="dropdown"
          size="sm"
        />
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All ({highlights.length})</TabsTrigger>
          <TabsTrigger value="product">Products ({highlights.filter((h) => h.type === "product").length})</TabsTrigger>
          <TabsTrigger value="moment">Key Moments ({highlights.filter((h) => h.type === "moment").length})</TabsTrigger>
          <TabsTrigger value="reaction">
            Reactions ({highlights.filter((h) => h.type === "reaction").length})
          </TabsTrigger>
          <TabsTrigger value="question">Q&A ({highlights.filter((h) => h.type === "question").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filteredHighlights.length > 0 ? (
          filteredHighlights.map((highlight) => (
            <Card key={highlight.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative aspect-video w-full sm:w-1/3">
                    <Image
                      src={highlight.thumbnail || "/placeholder.svg"}
                      alt={highlight.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-orange-500/80 hover:bg-orange-600/80"
                        onClick={() => playHighlight(highlight)}
                      >
                        <Play className="h-6 w-6" />
                      </Button>
                    </div>
                    <Badge className="absolute top-2 left-2 bg-orange-500">
                      {formatTimestamp(highlight.timestamp)}
                    </Badge>
                    <Badge className="absolute bottom-2 right-2 bg-zinc-800/80">
                      {formatTimestamp(highlight.duration)}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{highlight.title}</h3>
                      <Badge
                        variant="outline"
                        className={
                          highlight.type === "product"
                            ? "border-blue-500 text-blue-500"
                            : highlight.type === "moment"
                              ? "border-green-500 text-green-500"
                              : highlight.type === "reaction"
                                ? "border-purple-500 text-purple-500"
                                : "border-amber-500 text-amber-500"
                        }
                      >
                        {highlight.type === "product" && <ShoppingBag className="mr-1 h-3 w-3" />}
                        {highlight.type === "moment" && <Clock className="mr-1 h-3 w-3" />}
                        {highlight.type === "reaction" && <MessageSquare className="mr-1 h-3 w-3" />}
                        {highlight.type === "question" && <MessageSquare className="mr-1 h-3 w-3" />}
                        {highlight.type.charAt(0).toUpperCase() + highlight.type.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{highlight.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {highlight.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="mr-1 h-3 w-3" /> {tag}
                        </Badge>
                      ))}
                    </div>
                    {highlight.type === "product" && highlight.productId && (
                      <div className="rounded-md bg-zinc-50 p-2 dark:bg-zinc-800">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/products/${highlight.productId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {highlight.productName}
                          </Link>
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            ${highlight.productPrice?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between pt-2">
                      <Button variant="outline" size="sm" onClick={() => playHighlight(highlight)}>
                        <Play className="mr-2 h-4 w-4" /> Play
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => saveHighlight(highlight)}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                        <SocialShare
                          title={`${highlight.title} - Highlight from ${streamTitle}`}
                          description={highlight.description}
                          url={`/streams/${streamId}?t=${highlight.timestamp}`}
                          image={highlight.thumbnail}
                          variant="icon"
                        />
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <div className="mb-4 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No highlights found</h3>
            <p className="mb-6 text-center text-muted-foreground">
              No highlights match your current filter. Try selecting a different category.
            </p>
            <Button onClick={() => setActiveTab("all")}>View All Highlights</Button>
          </div>
        )}
      </div>
    </div>
  )
}
