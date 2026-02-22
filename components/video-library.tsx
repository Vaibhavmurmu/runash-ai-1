"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Clock, User, Search, Filter, BookOpen, Heart, Share2, Download } from "lucide-react"
import VideoExplanationPlayer from "./video-explanation-player"
import type { VideoExplanation } from "@/types/quiz"

// Sample video library data
const videoLibrary: VideoExplanation[] = [
  {
    id: "soil-health-fundamentals",
    title: "Soil Health Fundamentals for Organic Farmers",
    duration: 900,
    thumbnail: "/placeholder.svg?height=200&width=300",
    videoUrl: "https://example.com/soil-health-fundamentals",
    instructor: {
      name: "Dr. Sarah Johnson",
      avatar: "/placeholder.svg?height=60&width=60",
      title: "Soil Scientist",
      expertise: ["Soil Health", "Organic Matter", "pH Management"],
    },
    topics: ["Soil Testing", "pH Management", "Organic Matter", "Soil Structure"],
    difficulty: "beginner",
    relatedConcepts: ["Nutrient Cycling", "Plant Nutrition", "Sustainable Agriculture"],
    practicalTips: [
      "Test soil annually for pH and nutrients",
      "Add compost to improve soil structure",
      "Use cover crops to prevent erosion",
    ],
  },
  {
    id: "advanced-composting",
    title: "Advanced Composting Techniques and Troubleshooting",
    duration: 720,
    thumbnail: "/placeholder.svg?height=200&width=300",
    videoUrl: "https://example.com/advanced-composting",
    instructor: {
      name: "Maria Rodriguez",
      avatar: "/placeholder.svg?height=60&width=60",
      title: "Composting Specialist",
      expertise: ["Composting", "Waste Management", "Soil Biology"],
    },
    topics: ["Carbon-Nitrogen Ratio", "Temperature Management", "Troubleshooting"],
    difficulty: "advanced",
    relatedConcepts: ["Microbial Activity", "Organic Matter", "Nutrient Cycling"],
    practicalTips: [
      "Monitor pile temperature regularly",
      "Turn compost every 2-3 weeks",
      "Maintain proper moisture levels",
    ],
  },
  {
    id: "ipm-strategies",
    title: "Integrated Pest Management: From Theory to Practice",
    duration: 1080,
    thumbnail: "/placeholder.svg?height=200&width=300",
    videoUrl: "https://example.com/ipm-strategies",
    instructor: {
      name: "Dr. Michael Chen",
      avatar: "/placeholder.svg?height=60&width=60",
      title: "Entomologist",
      expertise: ["IPM", "Beneficial Insects", "Organic Pest Control"],
    },
    topics: ["Economic Thresholds", "Pest Monitoring", "Beneficial Insects"],
    difficulty: "intermediate",
    relatedConcepts: ["Ecosystem Balance", "Sustainable Agriculture", "Biodiversity"],
    practicalTips: [
      "Monitor pest populations weekly",
      "Identify beneficial insects",
      "Use economic thresholds for decisions",
    ],
  },
  {
    id: "water-efficient-irrigation",
    title: "Water-Efficient Irrigation Systems for Small Farms",
    duration: 660,
    thumbnail: "/placeholder.svg?height=200&width=300",
    videoUrl: "https://example.com/irrigation-systems",
    instructor: {
      name: "Rajesh Kumar",
      avatar: "/placeholder.svg?height=60&width=60",
      title: "Agricultural Engineer",
      expertise: ["Irrigation", "Water Management", "Farm Technology"],
    },
    topics: ["Drip Irrigation", "Water Conservation", "System Design"],
    difficulty: "intermediate",
    relatedConcepts: ["Water Efficiency", "Sustainable Farming", "Technology"],
    practicalTips: [
      "Install drip irrigation for water savings",
      "Use mulching to retain moisture",
      "Schedule irrigation during cooler hours",
    ],
  },
  {
    id: "crop-rotation-planning",
    title: "Strategic Crop Rotation Planning for Maximum Benefits",
    duration: 840,
    thumbnail: "/placeholder.svg?height=200&width=300",
    videoUrl: "https://example.com/crop-rotation",
    instructor: {
      name: "Dr. Priya Sharma",
      avatar: "/placeholder.svg?height=60&width=60",
      title: "Agronomist",
      expertise: ["Crop Rotation", "Soil Fertility", "Sustainable Systems"],
    },
    topics: ["Rotation Planning", "Nutrient Cycling", "Pest Management"],
    difficulty: "intermediate",
    relatedConcepts: ["Soil Health", "Biodiversity", "Farm Planning"],
    practicalTips: [
      "Plan rotations 3-4 years in advance",
      "Include nitrogen-fixing legumes",
      "Consider market demand in planning",
    ],
  },
  {
    id: "biodiversity-enhancement",
    title: "Enhancing On-Farm Biodiversity for Ecosystem Health",
    duration: 780,
    thumbnail: "/placeholder.svg?height=200&width=300",
    videoUrl: "https://example.com/biodiversity",
    instructor: {
      name: "Dr. Anand Patel",
      avatar: "/placeholder.svg?height=60&width=60",
      title: "Ecologist",
      expertise: ["Biodiversity", "Ecosystem Services", "Conservation"],
    },
    topics: ["Habitat Creation", "Native Plants", "Wildlife Corridors"],
    difficulty: "advanced",
    relatedConcepts: ["Ecosystem Services", "Conservation", "Sustainable Agriculture"],
    practicalTips: [
      "Plant native flowering strips",
      "Create water features for wildlife",
      "Maintain habitat corridors",
    ],
  },
]

export default function VideoLibrary() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [selectedVideo, setSelectedVideo] = useState<VideoExplanation | null>(null)
  const [showVideoDialog, setShowVideoDialog] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  const categories = ["all", ...Array.from(new Set(videoLibrary.flatMap((v) => v.topics)))]
  const difficulties = ["all", "beginner", "intermediate", "advanced"]

  const filteredVideos = videoLibrary.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.topics.some((topic) => topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
      video.instructor.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || video.topics.includes(selectedCategory)
    const matchesDifficulty = selectedDifficulty === "all" || video.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const handleVideoSelect = (video: VideoExplanation) => {
    setSelectedVideo(video)
    setShowVideoDialog(true)
  }

  const toggleFavorite = (videoId: string) => {
    setFavorites((prev) => (prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]))
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} min`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Organic Farming Video Library</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Learn from expert farmers and scientists with our comprehensive collection of educational videos covering all
          aspects of organic agriculture.
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search videos, topics, or instructors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty === "all" ? "All Levels" : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Video Grid */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="relative">
                  <img
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="lg"
                      onClick={() => handleVideoSelect(video)}
                      className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                    >
                      <Play className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/60 text-white">
                      {formatDuration(video.duration)}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(video.id)
                    }}
                    className="absolute top-2 left-2 text-white hover:bg-white/20"
                  >
                    <Heart className={`h-4 w-4 ${favorites.includes(video.id) ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold line-clamp-2 mb-1">{video.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{video.instructor.name}</span>
                        <Badge variant="outline" size="sm">
                          {video.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {video.topics.slice(0, 3).map((topic, index) => (
                        <Badge key={index} variant="secondary" size="sm">
                          {topic}
                        </Badge>
                      ))}
                      {video.topics.length > 3 && (
                        <Badge variant="secondary" size="sm">
                          +{video.topics.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Button onClick={() => handleVideoSelect(video)} className="flex-1 mr-2">
                        <Play className="h-4 w-4 mr-2" />
                        Watch Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <img
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.title}
                      className="w-32 h-24 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{video.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{video.instructor.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatDuration(video.duration)}</span>
                            </div>
                            <Badge variant="outline">{video.difficulty}</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => toggleFavorite(video.id)}>
                          <Heart
                            className={`h-4 w-4 ${favorites.includes(video.id) ? "fill-red-500 text-red-500" : ""}`}
                          />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {video.topics.map((topic, index) => (
                          <Badge key={index} variant="secondary" size="sm">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button onClick={() => handleVideoSelect(video)}>
                          <Play className="h-4 w-4 mr-2" />
                          Watch Now
                        </Button>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Transcript
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Resources
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites">
          {favorites.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
                <p className="text-gray-600">Click the heart icon on videos to add them to your favorites</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoLibrary
                .filter((video) => favorites.includes(video.id))
                .map((video) => (
                  <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    {/* Same card content as grid view */}
                    <div className="relative">
                      <img
                        src={video.thumbnail || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="lg"
                          onClick={() => handleVideoSelect(video)}
                          className="rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                        >
                          <Play className="h-6 w-6" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-black/60 text-white">
                          {formatDuration(video.duration)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(video.id)
                        }}
                        className="absolute top-2 left-2 text-white hover:bg-white/20"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold line-clamp-2 mb-1">{video.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="h-4 w-4" />
                            <span>{video.instructor.name}</span>
                            <Badge variant="outline" size="sm">
                              {video.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {video.topics.slice(0, 3).map((topic, index) => (
                            <Badge key={index} variant="secondary" size="sm">
                              {topic}
                            </Badge>
                          ))}
                          {video.topics.length > 3 && (
                            <Badge variant="secondary" size="sm">
                              +{video.topics.length - 3}
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <Button onClick={() => handleVideoSelect(video)} className="flex-1 mr-2">
                            <Play className="h-4 w-4 mr-2" />
                            Watch Now
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {selectedVideo && (
            <VideoExplanationPlayer video={selectedVideo} onClose={() => setShowVideoDialog(false)} autoPlay={true} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
