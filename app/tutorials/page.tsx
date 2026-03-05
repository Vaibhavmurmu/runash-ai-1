"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, Play, Search, Star, User } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TutorialLevel = "Beginner" | "Intermediate" | "Advanced"
type TutorialTab = "all" | "getting-started" | "ai-features" | "streaming" | "advanced"
type SortOption = "newest" | "shortest" | "beginner-first"

type Tutorial = {
  id: string
  title: string
  description: string
  durationLabel: string
  durationMinutes: number
  level: TutorialLevel
  author: string
  thumbnail: string
  category: string
  tab: Exclude<TutorialTab, "all">
  featured?: boolean
  publishedAt: string
  completed?: boolean
  lastWatchedAt?: string
}

const tutorials: Tutorial[] = [
  {
    id: "setup-guide",
    title: "Complete RunAsh AI Setup Guide",
    description: "Learn how to set up RunAsh AI from scratch and configure your first stream.",
    durationLabel: "15 min",
    durationMinutes: 15,
    level: "Beginner",
    author: "Sarah Johnson",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "Getting Started",
    tab: "getting-started",
    featured: true,
    publishedAt: "2026-02-20T10:00:00.000Z",
    completed: true,
    lastWatchedAt: "2026-02-22T09:10:00.000Z",
  },
  {
    id: "first-stream",
    title: "Your First AI-Enhanced Stream",
    description: "Step-by-step guide to creating your first stream with AI enhancements.",
    durationLabel: "10 min",
    durationMinutes: 10,
    level: "Beginner",
    author: "Alex Chen",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "Getting Started",
    tab: "getting-started",
    publishedAt: "2026-02-10T11:30:00.000Z",
  },
  {
    id: "video-enhancement",
    title: "AI Video Enhancement Basics",
    description: "Learn how to use RunAsh's AI video enhancement to automatically improve your stream quality.",
    durationLabel: "8 min",
    durationMinutes: 8,
    level: "Beginner",
    author: "Alex Chen",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "AI Features",
    tab: "ai-features",
    publishedAt: "2026-02-18T14:00:00.000Z",
    completed: true,
    lastWatchedAt: "2026-02-21T16:45:00.000Z",
  },
  {
    id: "virtual-backgrounds",
    title: "Custom Virtual Backgrounds",
    description: "Create and use custom virtual backgrounds without a green screen using AI.",
    durationLabel: "6 min",
    durationMinutes: 6,
    level: "Beginner",
    author: "Emma Wilson",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "AI Features",
    tab: "ai-features",
    publishedAt: "2026-02-16T08:45:00.000Z",
  },
  {
    id: "multi-platform-streaming",
    title: "Multi-Platform Streaming Setup",
    description: "Configure streaming to multiple platforms simultaneously with platform-specific optimizations.",
    durationLabel: "12 min",
    durationMinutes: 12,
    level: "Intermediate",
    author: "Michael Rodriguez",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "Streaming",
    tab: "streaming",
    publishedAt: "2026-02-14T13:20:00.000Z",
  },
  {
    id: "chat-moderation",
    title: "Advanced Chat Moderation",
    description: "Set up AI-powered chat moderation with custom rules and automated responses.",
    durationLabel: "10 min",
    durationMinutes: 10,
    level: "Advanced",
    author: "David Kim",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "Advanced",
    tab: "advanced",
    publishedAt: "2026-02-12T15:00:00.000Z",
  },
  {
    id: "stream-analytics",
    title: "Stream Analytics Deep Dive",
    description: "Understand your audience with RunAsh's comprehensive analytics dashboard.",
    durationLabel: "14 min",
    durationMinutes: 14,
    level: "Intermediate",
    author: "Priya Patel",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "Analytics",
    tab: "streaming",
    publishedAt: "2026-02-08T10:40:00.000Z",
  },
  {
    id: "api-guide",
    title: "API Integration Guide",
    description: "Integrate RunAsh AI with your existing tools using our comprehensive API.",
    durationLabel: "20 min",
    durationMinutes: 20,
    level: "Advanced",
    author: "Tech Team",
    thumbnail: "/placeholder.svg?height=300&width=400",
    category: "Advanced",
    tab: "advanced",
    publishedAt: "2026-02-06T09:00:00.000Z",
  },
]

const levelPriority: Record<TutorialLevel, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
}

const tabLabel: Record<TutorialTab, string> = {
  all: "All Tutorials",
  "getting-started": "Getting Started",
  "ai-features": "AI Features",
  streaming: "Streaming",
  advanced: "Advanced",
}

const TutorialCard = ({ tutorial }: { tutorial: Tutorial }) => {
  return (
    <Card
      className={`overflow-hidden ${tutorial.featured ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20" : "border-orange-200/50 dark:border-orange-900/30"}`}
    >
      <div className="relative aspect-video overflow-hidden group">
        <img
          src={tutorial.thumbnail || "/placeholder.svg"}
          alt={tutorial.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {tutorial.durationLabel}
          </Badge>
        </div>
        {tutorial.featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-yellow-500 text-black">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/50">
            {tutorial.category}
          </Badge>
          <Badge variant={tutorial.level === "Beginner" ? "default" : tutorial.level === "Intermediate" ? "secondary" : "destructive"}>
            {tutorial.level}
          </Badge>
          {tutorial.completed && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              Completed
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-bold mb-3 line-clamp-2">{tutorial.title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{tutorial.description}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 min-w-0">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{tutorial.author}</span>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
          >
            Watch Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TutorialsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TutorialTab>("all")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [activeLevels, setActiveLevels] = useState<TutorialLevel[]>([])
  const [authorFilter, setAuthorFilter] = useState<string>("all-authors")

  const authors = useMemo(() => {
    const uniqueAuthors = Array.from(new Set(tutorials.map((tutorial) => tutorial.author)))
    return uniqueAuthors.sort((a, b) => a.localeCompare(b))
  }, [])

  const visibleTutorials = useMemo(() => {
    return tutorials
      .filter((tutorial) => (activeTab === "all" ? true : tutorial.tab === activeTab))
      .filter((tutorial) => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) {
          return true
        }

        return [tutorial.title, tutorial.description, tutorial.author, tutorial.category]
          .join(" ")
          .toLowerCase()
          .includes(query)
      })
      .filter((tutorial) => (activeLevels.length === 0 ? true : activeLevels.includes(tutorial.level)))
      .filter((tutorial) => (authorFilter === "all-authors" ? true : tutorial.author === authorFilter))
      .sort((a, b) => {
        if (sortOption === "newest") {
          const dateDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          if (dateDiff !== 0) {
            return dateDiff
          }
        }

        if (sortOption === "shortest") {
          const durationDiff = a.durationMinutes - b.durationMinutes
          if (durationDiff !== 0) {
            return durationDiff
          }
        }

        if (sortOption === "beginner-first") {
          const levelDiff = levelPriority[a.level] - levelPriority[b.level]
          if (levelDiff !== 0) {
            return levelDiff
          }
        }

        return a.title.localeCompare(b.title)
      })
  }, [activeLevels, activeTab, authorFilter, searchQuery, sortOption])

  const featuredTutorial = tutorials.find((tutorial) => tutorial.featured)

  const toggleLevel = (level: TutorialLevel) => {
    setActiveLevels((previous) =>
      previous.includes(level) ? previous.filter((value) => value !== level) : [...previous, level],
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-950 dark:via-orange-950/30 dark:to-gray-950"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 dark:opacity-10"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-6 px-6 py-2 border border-orange-500/30 rounded-full bg-orange-500/10 backdrop-blur-sm">
              <span className="text-orange-600 dark:text-orange-400">Learn RunAsh AI</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Video Tutorials
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              Master RunAsh AI with our comprehensive video tutorials. From basic setup to advanced features.
            </p>

            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 dark:bg-gray-900/50 border-orange-200 dark:border-orange-800/30 focus:border-orange-500/70"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TutorialTab)} className="mb-8">
              <TabsList className="bg-orange-100/50 dark:bg-orange-900/20">
                <TabsTrigger value="all">All Tutorials</TabsTrigger>
                <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
                <TabsTrigger value="ai-features">AI Features</TabsTrigger>
                <TabsTrigger value="streaming">Streaming</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-8">
                {activeTab === "all" && featuredTutorial && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Featured Tutorial</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                      <div className="relative aspect-video overflow-hidden rounded-xl group">
                        <img
                          src={featuredTutorial.thumbnail}
                          alt="Featured tutorial"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Play className="h-10 w-10 text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge variant="secondary" className="bg-black/50 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            {featuredTutorial.durationLabel}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/50">
                            {featuredTutorial.category}
                          </Badge>
                          <Badge className="bg-yellow-500 text-black">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                        <h3 className="text-3xl font-bold mb-4">{featuredTutorial.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">{featuredTutorial.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{featuredTutorial.author}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{featuredTutorial.durationMinutes} minutes</span>
                          </div>
                          <Badge variant="default">{featuredTutorial.level}</Badge>
                        </div>
                        <Button className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white">
                          Watch Tutorial <Play className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{tabLabel[activeTab]}</h2>

                  <div className="mb-6 space-y-4 rounded-xl border border-orange-200/60 dark:border-orange-900/30 p-4 bg-white/70 dark:bg-gray-900/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Sort by</p>
                        <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                          <SelectTrigger className="bg-white dark:bg-gray-900">
                            <SelectValue placeholder="Sort tutorials" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest</SelectItem>
                            <SelectItem value="shortest">Shortest duration</SelectItem>
                            <SelectItem value="beginner-first">Beginner-first</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {authors.length > 1 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Author</p>
                          <Select value={authorFilter} onValueChange={setAuthorFilter}>
                            <SelectTrigger className="bg-white dark:bg-gray-900">
                              <SelectValue placeholder="All authors" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-authors">All authors</SelectItem>
                              {authors.map((author) => (
                                <SelectItem key={author} value={author}>
                                  {author}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Difficulty</p>
                      <div className="flex flex-wrap gap-2">
                        {(["Beginner", "Intermediate", "Advanced"] as TutorialLevel[]).map((level) => {
                          const isActive = activeLevels.includes(level)
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => toggleLevel(level)}
                              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                isActive
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-900/40"
                              }`}
                            >
                              {level}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {visibleTutorials.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No tutorials matched your current filters.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {visibleTutorials.map((tutorial) => (
                        <TutorialCard key={tutorial.id} tutorial={tutorial} />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-white dark:bg-gray-950 border-t border-orange-200/50 dark:border-orange-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500">
            <p>© {new Date().getFullYear()} RunAsh AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
