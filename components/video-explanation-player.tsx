"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Subtitles,
  BookOpen,
  User,
  Clock,
  Target,
  Lightbulb,
  Download,
  Share2,
  ThumbsUp,
  MessageCircle,
} from "lucide-react"
import type { VideoExplanation } from "@/types/quiz"

interface VideoExplanationPlayerProps {
  video: VideoExplanation
  onComplete?: () => void
  onClose?: () => void
  autoPlay?: boolean
  questionContext?: string
}

export default function VideoExplanationPlayer({
  video,
  onComplete,
  onClose,
  autoPlay = false,
  questionContext,
}: VideoExplanationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [watchedPercentage, setWatchedPercentage] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Simulate video with placeholder
  useEffect(() => {
    setDuration(video.duration)
    if (autoPlay) {
      setIsPlaying(true)
    }
  }, [video.duration, autoPlay])

  // Update progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && currentTime < duration) {
        setCurrentTime((prev) => {
          const newTime = prev + 1
          const percentage = (newTime / duration) * 100
          setWatchedPercentage(percentage)

          // Mark as complete when 90% watched
          if (percentage >= 90 && onComplete) {
            onComplete()
          }

          return newTime
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, currentTime, duration, onComplete])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleSeek = (newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(newTime, duration)))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const skipTime = (seconds: number) => {
    handleSeek(currentTime + seconds)
  }

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
  }

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{video.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatTime(video.duration)}</span>
              </div>
              <Badge variant="outline">{video.difficulty}</Badge>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{video.instructor.name}</span>
              </div>
            </div>
            {questionContext && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <Target className="h-4 w-4 inline mr-1" />
                  Related to: {questionContext}
                </p>
              </div>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Video Player */}
        <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {/* Video placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
            <img
              src={video.thumbnail || "/placeholder.svg?height=400&width=600"}
              alt={video.title}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={togglePlay}
                className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </Button>
            </div>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-3">
              <Progress value={(currentTime / duration) * 100} className="h-1 bg-white/20" />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => skipTime(-10)}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => skipTime(10)} className="text-white hover:bg-white/20">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <span className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(Number(e.target.value))}
                  className="bg-white/20 rounded px-2 py-1 text-sm"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className="text-white hover:bg-white/20"
                >
                  <Subtitles className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Subtitles */}
          {showSubtitles && (
            <div className="absolute bottom-16 left-0 right-0 text-center">
              <div className="inline-block bg-black/80 text-white px-4 py-2 rounded text-sm max-w-2xl">
                In this section, we'll explore how soil pH affects nutrient availability and plant health...
              </div>
            </div>
          )}
        </div>

        {/* Video Information Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="instructor">Instructor</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Topics Covered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {video.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Key Takeaways
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {video.practicalTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Related Concepts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {video.relatedConcepts.map((concept, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer hover:bg-gray-100">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Watched</span>
                    <span>{watchedPercentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={watchedPercentage} className="h-2" />
                  <p className="text-xs text-gray-600">
                    {watchedPercentage >= 90 ? "✓ Completed" : "Watch 90% to mark as complete"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcript" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Transcript</CardTitle>
                <p className="text-sm text-gray-600">Click on any timestamp to jump to that section</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSeek(0)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-xs flex-shrink-0"
                      >
                        [00:00]
                      </button>
                      <p>
                        Welcome to our comprehensive guide on soil health and pH management. In this video, we'll
                        explore how soil acidity affects plant growth and nutrient uptake.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSeek(45)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-xs flex-shrink-0"
                      >
                        [00:45]
                      </button>
                      <p>
                        Soil pH is measured on a scale from 1 to 14, with 7 being neutral. Most vegetables prefer
                        slightly acidic to neutral conditions, typically between 6.0 and 7.0.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSeek(95)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-xs flex-shrink-0"
                      >
                        [01:35]
                      </button>
                      <p>
                        When soil is too acidic or too alkaline, nutrients become locked up and unavailable to plants,
                        even if they're present in adequate amounts.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSeek(140)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-xs flex-shrink-0"
                      >
                        [02:20]
                      </button>
                      <p>
                        To test your soil pH, you can use simple test strips, digital meters, or send samples to a
                        laboratory for detailed analysis.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSeek(180)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-xs flex-shrink-0"
                      >
                        [03:00]
                      </button>
                      <p>
                        If your soil is too acidic, adding agricultural lime can help raise the pH. For alkaline soils,
                        organic matter like compost can help lower the pH over time.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Downloadable Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Soil pH Testing Guide (PDF)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Lime Application Calculator (Excel)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    pH Adjustment Timeline (PDF)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Learning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Soil Chemistry Deep Dive
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Nutrient Deficiency Guide
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Organic Amendments Guide
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tools & Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <img
                      src="/placeholder.svg?height=100&width=100"
                      alt="pH Test Kit"
                      className="mx-auto mb-2 rounded-lg"
                    />
                    <h4 className="font-medium">Digital pH Meter</h4>
                    <p className="text-sm text-gray-600">₹1,200 - ₹3,500</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Shop Now
                    </Button>
                  </div>
                  <div className="text-center">
                    <img
                      src="/placeholder.svg?height=100&width=100"
                      alt="Test Strips"
                      className="mx-auto mb-2 rounded-lg"
                    />
                    <h4 className="font-medium">pH Test Strips</h4>
                    <p className="text-sm text-gray-600">₹150 - ₹400</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Shop Now
                    </Button>
                  </div>
                  <div className="text-center">
                    <img
                      src="/placeholder.svg?height=100&width=100"
                      alt="Agricultural Lime"
                      className="mx-auto mb-2 rounded-lg"
                    />
                    <h4 className="font-medium">Agricultural Lime</h4>
                    <p className="text-sm text-gray-600">₹800 - ₹1,500/bag</p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Shop Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructor" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={video.instructor.avatar || "/placeholder.svg?height=80&width=80"}
                    alt={video.instructor.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{video.instructor.name}</h3>
                    <p className="text-gray-600 mb-2">{video.instructor.title}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {video.instructor.expertise.map((area, index) => (
                        <Badge key={index} variant="secondary">
                          {area}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      Dr. Sarah Johnson is a soil scientist with over 15 years of experience in organic agriculture. She
                      has helped thousands of farmers transition to sustainable farming practices and is a recognized
                      expert in soil health management.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Ask Question
                      </Button>
                      <Button size="sm" variant="outline">
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4" />
            Helpful ({Math.floor(Math.random() * 100) + 50})
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share Video
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Take Notes
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
