"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, Play, Search, Star, User } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const TutorialCard = ({
  title,
  description,
  duration,
  difficulty,
  author,
  thumbnail,
  category,
  featured = false,
  href: ctaHref,
  isExternal = false,
}: {
  title: string
  description: string
  duration: string
  difficulty: string
  author: string
  thumbnail: string
  category: string
  featured?: boolean
  href?: string
  isExternal?: boolean
}) => {
  return (
    <Card
      className={`overflow-hidden ${featured ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20" : "border-orange-200/50 dark:border-orange-900/30"}`}
    >
      <div className="relative aspect-video overflow-hidden group">
        <img
          src={thumbnail || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {duration}
          </Badge>
        </div>
        {featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-yellow-500 text-black">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/50">
            {category}
          </Badge>
          <Badge
            variant={
              difficulty === "Beginner" ? "default" : difficulty === "Intermediate" ? "secondary" : "destructive"
            }
          >
            {difficulty}
          </Badge>
        </div>
        <h3 className="text-xl font-bold mb-3 line-clamp-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{author}</span>
          </div>
          <Button
            asChild={Boolean(ctaHref)}
            size="sm"
            disabled={!ctaHref}
            className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
          >
            {ctaHref ? (
              isExternal ? (
                <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                  Watch Now
                </a>
              ) : (
                <Link href={ctaHref}>Watch Now</Link>
              )
            ) : (
              <span>Coming soon</span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TutorialsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const featuredTutorialCta = {
    href: "https://docs.runash.in/tutorials",
    isExternal: true,
  }
  const featuredCtaHref = featuredTutorialCta.href

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero Section */}
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

            {/* Search */}
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

      {/* Tutorial Content */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="all" className="mb-8">
              <TabsList className="bg-orange-100/50 dark:bg-orange-900/20">
                <TabsTrigger value="all">All Tutorials</TabsTrigger>
                <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
                <TabsTrigger value="ai-features">AI Features</TabsTrigger>
                <TabsTrigger value="streaming">Streaming</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-8">
                {/* Featured Tutorial */}
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Featured Tutorial</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="relative aspect-video overflow-hidden rounded-xl group">
                      <img
                        src="/placeholder.svg?height=400&width=600"
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
                          15 min
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/50">
                          Getting Started
                        </Badge>
                        <Badge className="bg-yellow-500 text-black">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                      <h3 className="text-3xl font-bold mb-4">Complete RunAsh AI Setup Guide</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
                        Learn how to set up RunAsh AI from scratch, connect your streaming platforms, and configure your
                        first AI-enhanced stream in under 15 minutes.
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Sarah Johnson</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>15 minutes</span>
                        </div>
                        <Badge variant="default">Beginner</Badge>
                      </div>
                      <Button
                        asChild={Boolean(featuredCtaHref)}
                        disabled={!featuredCtaHref}
                        className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
                      >
                        {featuredCtaHref ? (
                          featuredTutorialCta.isExternal ? (
                            <a href={featuredCtaHref} target="_blank" rel="noopener noreferrer">
                              Watch Tutorial <Play className="ml-2 h-4 w-4" />
                            </a>
                          ) : (
                            <Link href={featuredCtaHref}>
                              Watch Tutorial <Play className="ml-2 h-4 w-4" />
                            </Link>
                          )
                        ) : (
                          <span>Coming soon</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tutorial Grid */}
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">All Tutorials</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <TutorialCard
                      title="AI Video Enhancement Basics"
                      description="Learn how to use RunAsh's AI video enhancement to automatically improve your stream quality."
                      duration="8 min"
                      difficulty="Beginner"
                      author="Alex Chen"
                      thumbnail="/placeholder.svg?height=300&width=400"
                      category="AI Features"
                      href="https://docs.runash.in/tutorials"
                      isExternal={true}
                    />
                    <TutorialCard
                      title="Multi-Platform Streaming Setup"
                      description="Configure streaming to multiple platforms simultaneously with platform-specific optimizations."
                      duration="12 min"
                      difficulty="Intermediate"
                      author="Michael Rodriguez"
                      thumbnail="/placeholder.svg?height=300&width=400"
                      category="Streaming"
                      href="https://docs.runash.in/tutorials"
                      isExternal={true}
                    />
                    <TutorialCard
                      title="Custom Virtual Backgrounds"
                      description="Create and use custom virtual backgrounds without a green screen using AI."
                      duration="6 min"
                      difficulty="Beginner"
                      author="Emma Wilson"
                      thumbnail="/placeholder.svg?height=300&width=400"
                      category="AI Features"
                      href="https://docs.runash.in/tutorials"
                      isExternal={true}
                    />
                    <TutorialCard
                      title="Advanced Chat Moderation"
                      description="Set up AI-powered chat moderation with custom rules and automated responses."
                      duration="10 min"
                      difficulty="Advanced"
                      author="David Kim"
                      thumbnail="/placeholder.svg?height=300&width=400"
                      category="Advanced"
                    />
                    <TutorialCard
                      title="Stream Analytics Deep Dive"
                      description="Understand your audience with RunAsh's comprehensive analytics dashboard."
                      duration="14 min"
                      difficulty="Intermediate"
                      author="Priya Patel"
                      thumbnail="/placeholder.svg?height=300&width=400"
                      category="Analytics"
                    />
                    <TutorialCard
                      title="API Integration Guide"
                      description="Integrate RunAsh AI with your existing tools using our comprehensive API."
                      duration="20 min"
                      difficulty="Advanced"
                      author="Tech Team"
                      thumbnail="/placeholder.svg?height=300&width=400"
                      category="Advanced"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="getting-started" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <TutorialCard
                    title="Complete RunAsh AI Setup Guide"
                    description="Learn how to set up RunAsh AI from scratch and configure your first stream."
                    duration="15 min"
                    difficulty="Beginner"
                    author="Sarah Johnson"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="Getting Started"
                    featured={true}
                    href="https://docs.runash.in/tutorials"
                    isExternal={true}
                  />
                  <TutorialCard
                    title="Your First AI-Enhanced Stream"
                    description="Step-by-step guide to creating your first stream with AI enhancements."
                    duration="10 min"
                    difficulty="Beginner"
                    author="Alex Chen"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="Getting Started"
                    href="https://docs.runash.in/tutorials"
                    isExternal={true}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai-features" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <TutorialCard
                    title="AI Video Enhancement Basics"
                    description="Learn how to use RunAsh's AI video enhancement to automatically improve your stream quality."
                    duration="8 min"
                    difficulty="Beginner"
                    author="Alex Chen"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="AI Features"
                    href="https://docs.runash.in/tutorials"
                    isExternal={true}
                  />
                  <TutorialCard
                    title="Custom Virtual Backgrounds"
                    description="Create and use custom virtual backgrounds without a green screen using AI."
                    duration="6 min"
                    difficulty="Beginner"
                    author="Emma Wilson"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="AI Features"
                    href="https://docs.runash.in/tutorials"
                    isExternal={true}
                  />
                </div>
              </TabsContent>

              <TabsContent value="streaming" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <TutorialCard
                    title="Multi-Platform Streaming Setup"
                    description="Configure streaming to multiple platforms simultaneously with platform-specific optimizations."
                    duration="12 min"
                    difficulty="Intermediate"
                    author="Michael Rodriguez"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="Streaming"
                    href="https://docs.runash.in/tutorials"
                    isExternal={true}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <TutorialCard
                    title="Advanced Chat Moderation"
                    description="Set up AI-powered chat moderation with custom rules and automated responses."
                    duration="10 min"
                    difficulty="Advanced"
                    author="David Kim"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="Advanced"
                  />
                  <TutorialCard
                    title="API Integration Guide"
                    description="Integrate RunAsh AI with your existing tools using our comprehensive API."
                    duration="20 min"
                    difficulty="Advanced"
                    author="Tech Team"
                    thumbnail="/placeholder.svg?height=300&width=400"
                    category="Advanced"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Footer */}
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
