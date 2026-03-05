"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Clock, Play, Search, Star, User } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getCategoryLabel,
  getFeaturedTutorial,
  getTutorialsByCategory,
  getVisibleTutorials,
  type Tutorial,
  type TutorialCategory,
  type TutorialTab,
} from "@/lib/tutorials"

const TutorialCard = ({
  title,
  description,
  duration,
  difficulty,
  author,
  thumbnail,
  category,
  featured = false,
}: Tutorial) => {
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
            {getCategoryLabel(category)}
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

  const categoryTabs: TutorialCategory[] = ["getting-started", "ai-features", "streaming", "advanced"]
  const featuredTutorial = getFeaturedTutorial()
  const allVisibleTutorials = getVisibleTutorials({ tab: activeTab, searchQuery })

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
                {categoryTabs.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {getCategoryLabel(category)} ({getTutorialsByCategory(category).length})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all" className="mt-8">
                {featuredTutorial && (
                  <div className="mb-12 p-8 rounded-2xl border border-orange-200/50 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-950/10">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Featured Tutorial</h2>
                    <div className="grid lg:grid-cols-2 gap-8 items-center">
                      <div className="relative aspect-video rounded-xl overflow-hidden group cursor-pointer">
                        <img src={featuredTutorial.thumbnail} alt={featuredTutorial.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Play className="h-10 w-10 text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge variant="secondary" className="bg-black/50 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            {featuredTutorial.duration}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-500/50">
                            {getCategoryLabel(featuredTutorial.category)}
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
                            <span>{featuredTutorial.duration}</span>
                          </div>
                          <Badge variant="default">{featuredTutorial.difficulty}</Badge>
                        </div>
                        <Button className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white">
                          Watch Tutorial <Play className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">All Tutorials</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allVisibleTutorials.map((tutorial) => (
                      <TutorialCard key={tutorial.title} {...tutorial} />
                    ))}
                  </div>
                </div>
              </TabsContent>

              {categoryTabs.map((category) => {
                const categoryVisibleTutorials = getVisibleTutorials({ tab: category, searchQuery })

                return (
                  <TabsContent key={category} value={category} className="mt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {categoryVisibleTutorials.map((tutorial) => (
                        <TutorialCard key={tutorial.title} {...tutorial} />
                      ))}
                    </div>
                  </TabsContent>
                )
              })}
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
