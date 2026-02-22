"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Play,
  Users,
  Heart,
  Clock,
  Leaf,
  MapPin,
  Star,
  Truck,
  Shield,
  TrendingUp,
  Eye,
  MessageSquare,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function LiveOrganicStreams() {
  const [likedStreams, setLikedStreams] = useState<number[]>([])
  const [viewerCounts, setViewerCounts] = useState<{ [key: number]: number }>({})

  const liveOrganicStreams = [
    {
      id: 1,
      title: "Fresh Organic Vegetable Harvest Live",
      host: "Green Valley Farms",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 1247,
      category: "Fresh Vegetables",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "2h 35m",
      likes: 456,
      location: "Kerala, India",
      certification: "USDA Organic",
      specialOffer: "30% off first order",
      farmRating: 4.9,
      isVerified: true,
      liveProducts: ["Organic Tomatoes", "Fresh Spinach", "Organic Carrots"],
      currentDiscount: 25,
      deliveryTime: "Same Day",
    },
    {
      id: 2,
      title: "Organic Spice Garden Tour & Tasting",
      host: "Spice Heritage Co.",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 892,
      category: "Spices & Herbs",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "1h 45m",
      likes: 234,
      location: "Rajasthan, India",
      certification: "India Organic",
      specialOffer: "Buy 2 Get 1 Free",
      farmRating: 4.8,
      isVerified: true,
      liveProducts: ["Turmeric Powder", "Organic Cumin", "Fresh Coriander"],
      currentDiscount: 40,
      deliveryTime: "Next Day",
    },
    {
      id: 3,
      title: "Premium Organic Grains Showcase",
      host: "Heritage Grains",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 634,
      category: "Grains & Millets",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "3h 10m",
      likes: 189,
      location: "Karnataka, India",
      certification: "NPOP Certified",
      specialOffer: "Bulk order discounts",
      farmRating: 4.7,
      isVerified: true,
      liveProducts: ["Organic Quinoa", "Finger Millet", "Brown Rice"],
      currentDiscount: 20,
      deliveryTime: "2-3 Days",
    },
    {
      id: 4,
      title: "Organic Fruit Orchard Live Picking",
      host: "Sunshine Orchards",
      hostAvatar: "/placeholder.svg?height=32&width=32",
      viewers: 1156,
      category: "Fresh Fruits",
      thumbnail: "/placeholder.svg?height=200&width=300",
      duration: "1h 20m",
      likes: 378,
      location: "Himachal Pradesh, India",
      certification: "EU Organic",
      specialOffer: "Free shipping on orders above ₹1000",
      farmRating: 4.9,
      isVerified: true,
      liveProducts: ["Organic Apples", "Fresh Pears", "Organic Plums"],
      currentDiscount: 35,
      deliveryTime: "Same Day",
    },
  ]

  // Initialize viewer counts
  useEffect(() => {
    const initialCounts: { [key: number]: number } = {}
    liveOrganicStreams.forEach((stream) => {
      initialCounts[stream.id] = stream.viewers
    })
    setViewerCounts(initialCounts)
  }, [])

  // Simulate live viewer count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCounts((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((id) => {
          const numId = Number.parseInt(id)
          updated[numId] += Math.floor(Math.random() * 20) - 10
          if (updated[numId] < 50) updated[numId] = 50
        })
        return updated
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const toggleLike = (streamId: number) => {
    setLikedStreams((prev) => (prev.includes(streamId) ? prev.filter((id) => id !== streamId) : [...prev, streamId]))
  }

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="relative">
            <div className="p-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500">
              <Play className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Live Organic Farms
          </h2>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          Join live streams from certified organic farms across India. Watch harvests in real-time, interact with
          farmers, and get exclusive deals on the freshest organic produce.
        </p>

        {/* Live Stats */}
        <div className="flex flex-wrap justify-center gap-6 mt-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-950">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {liveOrganicStreams.length} Farms Live Now
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-950">
            <Users className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-600 dark:text-green-400">
              {Object.values(viewerCounts)
                .reduce((a, b) => a + b, 0)
                .toLocaleString()}{" "}
              Watching
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950">
            <Leaf className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-600 dark:text-blue-400">100% Certified Organic</span>
          </div>
        </div>
      </div>

      {/* Streams Grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
        {liveOrganicStreams.map((stream, index) => (
          <Card
            key={stream.id}
            className={cn(
              "group overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-white dark:bg-gray-900",
              "transform hover:scale-[1.02] hover:-translate-y-1",
            )}
            style={{
              animationDelay: `${index * 150}ms`,
              animation: "slideInUp 0.6s ease-out forwards",
            }}
          >
            <div className="relative">
              <Link href={`/streams/${stream.id}`}>
                <div className="aspect-video overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                  <img
                    src={stream.thumbnail || "/placeholder.svg"}
                    alt={stream.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </Link>

              {/* Live Badge */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Badge className="bg-red-500 hover:bg-red-600 shadow-lg">
                  <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-white"></div>
                  LIVE
                </Badge>
                <Badge className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                  <Leaf className="mr-1 h-3 w-3" />
                  {stream.certification}
                </Badge>
              </div>

              {/* Top Right Info */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Badge className="bg-black/70 text-white backdrop-blur-sm shadow-lg">
                  <Users className="mr-1 h-3 w-3" />
                  {viewerCounts[stream.id]?.toLocaleString() || stream.viewers.toLocaleString()}
                </Badge>
                <Badge className="bg-yellow-500 text-black shadow-lg">
                  <Star className="mr-1 h-3 w-3 fill-current" />
                  {stream.farmRating}
                </Badge>
              </div>

              {/* Duration */}
              <Badge className="absolute bottom-4 right-4 bg-black/70 text-white backdrop-blur-sm shadow-lg">
                <Clock className="mr-1 h-3 w-3" />
                {stream.duration}
              </Badge>

              {/* Special Offer Banner */}
              <div className="absolute bottom-4 left-4 right-16">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-2 rounded-lg shadow-lg">
                  <p className="font-bold text-sm text-center">{stream.currentDiscount}% OFF Live</p>
                </div>
              </div>

              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button size="lg" className="h-16 w-16 rounded-full bg-white/90 hover:bg-white shadow-xl">
                  <Play className="h-8 w-8 text-black" />
                </Button>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              {/* Category & Verification */}
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  {stream.category}
                </Badge>
                {stream.isVerified && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Shield className="mr-1 h-3 w-3" />
                    Verified Farm
                  </Badge>
                )}
              </div>

              {/* Title */}
              <Link href={`/streams/${stream.id}`}>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-green-600 transition-colors line-clamp-2 leading-tight">
                  {stream.title}
                </h3>
              </Link>

              {/* Farm Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-green-200">
                    <AvatarImage src={stream.hostAvatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-green-100 text-green-800">{stream.host.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{stream.host}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {stream.location}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Truck className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-600">{stream.deliveryTime}</span>
                  </div>
                </div>
              </div>

              {/* Live Products */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Live Products:
                </p>
                <div className="flex flex-wrap gap-2">
                  {stream.liveProducts.map((product, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs border-green-200 text-green-700 dark:border-green-800 dark:text-green-300"
                    >
                      {product}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Special Offer */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-1">
                  🎁 {stream.specialOffer}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(stream.id)}
                    className="flex items-center gap-1"
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-colors",
                        likedStreams.includes(stream.id) ? "fill-red-500 text-red-500" : "text-gray-600",
                      )}
                    />
                    <span className="text-sm">{stream.likes + (likedStreams.includes(stream.id) ? 1 : 0)}</span>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="text-sm">Chat</span>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <Link href={`/streams/${stream.id}`}>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                    Join Stream
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View All Button */}
      <div className="text-center pt-8">
        <Link href="/streams">
          <Button
            size="lg"
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Play className="mr-2 h-5 w-5" />
            View All Live Streams
            <TrendingUp className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
