"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Search, X, Mic, ArrowRight, Tag, Clock, Sparkles, History } from "lucide-react"
import { useAnalytics } from "@/components/analytics-provider"
import { getProducts } from "@/lib/products"
import Image from "next/image"

// Define types for search results
type SearchResultType = "product" | "stream" | "category" | "recording"

interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  description: string
  image?: string
  price?: number
  date?: string
  count?: number
  relevanceScore?: number
  tags?: string[]
}

export default function AISearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchIntent, setSearchIntent] = useState<string | null>(null)
  const router = useRouter()
  const { trackSearch } = useAnalytics()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedSearches = localStorage.getItem("recentSearches")
        if (savedSearches) {
          setRecentSearches(JSON.parse(savedSearches))
        }
      } catch (error) {
        console.error("Error loading recent searches:", error)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    try {
      const updatedSearches = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5)

      setRecentSearches(updatedSearches)

      if (typeof window !== "undefined") {
        localStorage.setItem("recentSearches", JSON.stringify(updatedSearches))
      }
    } catch (error) {
      console.error("Error saving recent search:", error)
    }
  }

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore - SpeechRecognition is not in the TypeScript types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
        performSearch(transcript)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Handle keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else {
      // Clear search when dialog closes
      setSearchResults([])
      setQuery("")
      setSearchIntent(null)
    }
  }, [open])

  // Generate search suggestions based on query
  useEffect(() => {
    if (query.length > 1) {
      // In a real app, this would call an API for AI-powered suggestions
      const generateSuggestions = () => {
        const allProducts = getProducts()
        const productNames = allProducts.map((p) => p.name.toLowerCase())
        const categories = Array.from(new Set(allProducts.map((p) => p.category.toLowerCase())))
        const brands = Array.from(new Set(allProducts.map((p) => p.brand.toLowerCase())))
        const features = allProducts.flatMap((p) => p.features.map((f) => f.toLowerCase()))

        const matchingProducts = productNames.filter((name) => name.includes(query.toLowerCase()))
        const matchingCategories = categories.filter((cat) => cat.includes(query.toLowerCase()))
        const matchingBrands = brands.filter((brand) => brand.includes(query.toLowerCase()))
        const matchingFeatures = features.filter((feature) => feature.includes(query.toLowerCase()))

        // Add some AI-powered semantic suggestions
        const semanticSuggestions = []

        // Price-related queries
        if (
          query.toLowerCase().includes("cheap") ||
          query.toLowerCase().includes("affordable") ||
          query.toLowerCase().includes("budget") ||
          query.toLowerCase().includes("under")
        ) {
          semanticSuggestions.push("affordable tech under $50")
          semanticSuggestions.push("budget-friendly smart home devices")
        }

        // Quality-related queries
        if (
          query.toLowerCase().includes("best") ||
          query.toLowerCase().includes("top") ||
          query.toLowerCase().includes("premium") ||
          query.toLowerCase().includes("quality")
        ) {
          semanticSuggestions.push("premium audio products")
          semanticSuggestions.push("top-rated smart devices")
        }

        // Feature-related queries
        if (query.toLowerCase().includes("wireless") || query.toLowerCase().includes("bluetooth")) {
          semanticSuggestions.push("wireless charging devices")
          semanticSuggestions.push("bluetooth speakers with long battery life")
        }

        // Use case queries
        if (
          query.toLowerCase().includes("home") ||
          query.toLowerCase().includes("office") ||
          query.toLowerCase().includes("travel")
        ) {
          semanticSuggestions.push("tech for home office setup")
          semanticSuggestions.push("travel-friendly gadgets")
        }

        // Combine and limit suggestions
        const allSuggestions = [
          ...matchingProducts.slice(0, 2),
          ...matchingCategories.map((c) => `${c} products`).slice(0, 2),
          ...matchingBrands.map((b) => `${b} products`).slice(0, 1),
          ...matchingFeatures.slice(0, 1),
          ...semanticSuggestions,
        ]

        return Array.from(new Set(allSuggestions)).slice(0, 5)
      }

      setSuggestions(generateSuggestions())
    } else {
      setSuggestions([])
    }
  }, [query])

  // Analyze search intent
  const analyzeSearchIntent = (searchQuery: string): string => {
    const query = searchQuery.toLowerCase()

    // Price-related intent
    if (
      query.includes("cheap") ||
      query.includes("affordable") ||
      query.includes("budget") ||
      query.includes("under") ||
      query.includes("less than") ||
      query.includes("inexpensive")
    ) {
      return "Looking for affordable options"
    }

    // Quality-related intent
    if (
      query.includes("best") ||
      query.includes("top") ||
      query.includes("premium") ||
      query.includes("quality") ||
      query.includes("high-end") ||
      query.includes("professional")
    ) {
      return "Searching for premium products"
    }

    // Feature-related intent
    if (
      query.includes("wireless") ||
      query.includes("bluetooth") ||
      query.includes("portable") ||
      query.includes("rechargeable")
    ) {
      return "Interested in wireless technology"
    }

    // Use case intent
    if (query.includes("home") || query.includes("office") || query.includes("travel") || query.includes("outdoor")) {
      return `Looking for products for ${
        query.includes("home")
          ? "home"
          : query.includes("office")
            ? "office"
            : query.includes("travel")
              ? "travel"
              : "outdoor use"
      }`
    }

    // Comparison intent
    if (query.includes("vs") || query.includes("versus") || query.includes("compare") || query.includes("difference")) {
      return "Comparing products"
    }

    // Review intent
    if (
      query.includes("review") ||
      query.includes("rating") ||
      query.includes("recommend") ||
      query.includes("worth it")
    ) {
      return "Looking for product reviews"
    }

    return "Exploring products"
  }

  // Calculate semantic relevance score (simulated)
  const calculateRelevanceScore = (item: any, searchQuery: string): number => {
    const query = searchQuery.toLowerCase()
    let score = 0

    // Direct name match
    if (item.title.toLowerCase().includes(query)) {
      score += 5
    }

    // Description match
    if (item.description.toLowerCase().includes(query)) {
      score += 3
    }

    // Tag match
    if (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(query))) {
      score += 4
    }

    // Price-related queries
    if (
      (query.includes("cheap") || query.includes("affordable") || query.includes("budget")) &&
      item.price &&
      item.price < 100
    ) {
      score += 4
    }

    if (
      (query.includes("premium") || query.includes("high-end") || query.includes("luxury")) &&
      item.price &&
      item.price > 200
    ) {
      score += 4
    }

    // Feature-related queries
    if (
      (query.includes("wireless") || query.includes("bluetooth")) &&
      (item.description.toLowerCase().includes("wireless") || item.description.toLowerCase().includes("bluetooth"))
    ) {
      score += 4
    }

    // Add some randomness to simulate complex AI ranking
    score += Math.random() * 2

    return Math.min(10, score)
  }

  // Perform search
  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsProcessing(true)

    // Save to recent searches
    saveRecentSearch(searchQuery)

    // Analyze search intent
    const intent = analyzeSearchIntent(searchQuery)
    setSearchIntent(intent)

    // In a real app, this would call an API for AI-powered search
    setTimeout(() => {
      const allProducts = getProducts()

      // Basic search by name, description, category, brand
      const directMatches = allProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )

      // Semantic search (simulated)
      const semanticMatches = []

      // Price-related queries
      if (
        searchQuery.toLowerCase().includes("cheap") ||
        searchQuery.toLowerCase().includes("affordable") ||
        searchQuery.toLowerCase().includes("budget") ||
        searchQuery.toLowerCase().includes("under")
      ) {
        semanticMatches.push(...allProducts.filter((p) => p.price < 100))
      }

      if (
        searchQuery.toLowerCase().includes("premium") ||
        searchQuery.toLowerCase().includes("high-end") ||
        searchQuery.toLowerCase().includes("luxury")
      ) {
        semanticMatches.push(...allProducts.filter((p) => p.price > 200))
      }

      // Feature-related queries
      if (searchQuery.toLowerCase().includes("wireless") || searchQuery.toLowerCase().includes("bluetooth")) {
        semanticMatches.push(
          ...allProducts.filter(
            (p) =>
              p.description.toLowerCase().includes("wireless") ||
              p.description.toLowerCase().includes("bluetooth") ||
              p.features.some((f) => f.toLowerCase().includes("wireless") || f.toLowerCase().includes("bluetooth")),
          ),
        )
      }

      // Use case queries
      if (searchQuery.toLowerCase().includes("home")) {
        semanticMatches.push(
          ...allProducts.filter(
            (p) =>
              p.category === "Smart Home" ||
              p.description.toLowerCase().includes("home") ||
              p.tags.some((t) => t.toLowerCase().includes("home")),
          ),
        )
      }

      if (searchQuery.toLowerCase().includes("travel") || searchQuery.toLowerCase().includes("portable")) {
        semanticMatches.push(
          ...allProducts.filter(
            (p) =>
              p.description.toLowerCase().includes("portable") ||
              p.description.toLowerCase().includes("travel") ||
              p.features.some((f) => f.toLowerCase().includes("portable") || f.toLowerCase().includes("travel")),
          ),
        )
      }

      // Combine results and remove duplicates
      const combinedResults = [...directMatches]
      semanticMatches.forEach((product) => {
        if (!combinedResults.some((p) => p.id === product.id)) {
          combinedResults.push(product)
        }
      })

      // Add some mock streams
      const streamResults = [
        {
          id: "stream-001",
          type: "stream" as SearchResultType,
          title: "Tech Showcase 2025",
          description: "Join us for an exclusive look at the latest gadgets and innovations",
          image: "/placeholder.svg?height=80&width=120",
          date: "Live in 2 days",
          tags: ["tech", "showcase", "gadgets", "innovation"],
        },
        {
          id: "stream-002",
          type: "stream" as SearchResultType,
          title: "Smart Home Workshop",
          description: "Learn how to set up and optimize your smart home devices",
          image: "/placeholder.svg?height=80&width=120",
          date: "Recorded • 2 hours",
          tags: ["smart home", "workshop", "tutorial", "devices"],
        },
        {
          id: "stream-003",
          type: "stream" as SearchResultType,
          title: "Budget Tech Finds Under $50",
          description: "Discover amazing tech products that won't break the bank",
          image: "/placeholder.svg?height=80&width=120",
          date: "Tomorrow at 7PM",
          tags: ["budget", "affordable", "tech", "deals"],
        },
        {
          id: "stream-004",
          type: "stream" as SearchResultType,
          title: "Wireless Audio Comparison",
          description: "We compare the top wireless earbuds and headphones on the market",
          image: "/placeholder.svg?height=80&width=120",
          date: "Recorded • 1 week ago",
          tags: ["wireless", "audio", "earbuds", "headphones", "comparison"],
        },
      ].filter(
        (stream) =>
          stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stream.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stream.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )

      // Add some mock recordings
      const recordingResults = [
        {
          id: "recording-001",
          type: "recording" as SearchResultType,
          title: "Premium Tech Review: Worth the Price?",
          description: "An in-depth look at whether premium tech products are worth the investment",
          image: "/placeholder.svg?height=80&width=120",
          date: "3 days ago • 45 min",
          tags: ["premium", "review", "tech", "high-end"],
        },
        {
          id: "recording-002",
          type: "recording" as SearchResultType,
          title: "Travel Tech Essentials 2025",
          description: "The must-have gadgets for travelers this year",
          image: "/placeholder.svg?height=80&width=120",
          date: "1 week ago • 32 min",
          tags: ["travel", "portable", "essentials", "gadgets"],
        },
      ].filter(
        (recording) =>
          recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recording.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recording.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )

      // Format product results
      const productResults = combinedResults.map((product) => ({
        id: product.id,
        type: "product" as SearchResultType,
        title: product.name,
        description: product.description.substring(0, 100) + "...",
        image: product.images[0] || "/placeholder.svg?height=80&width=80",
        price: product.price,
        tags: product.tags,
      }))

      // Add some mock categories
      const categoryResults = []
      if (searchQuery.toLowerCase().includes("smart") || searchQuery.toLowerCase().includes("home")) {
        categoryResults.push({
          id: "cat-smart-home",
          type: "category" as SearchResultType,
          title: "Smart Home",
          description: "Devices and systems to automate your home",
          count: 24,
          tags: ["smart", "home", "automation", "devices"],
        })
      }
      if (searchQuery.toLowerCase().includes("audio") || searchQuery.toLowerCase().includes("sound")) {
        categoryResults.push({
          id: "cat-audio",
          type: "category" as SearchResultType,
          title: "Audio",
          description: "Headphones, speakers, and sound systems",
          count: 18,
          tags: ["audio", "sound", "headphones", "speakers"],
        })
      }
      if (
        searchQuery.toLowerCase().includes("wearable") ||
        searchQuery.toLowerCase().includes("fitness") ||
        searchQuery.toLowerCase().includes("watch")
      ) {
        categoryResults.push({
          id: "cat-wearables",
          type: "category" as SearchResultType,
          title: "Wearables",
          description: "Smartwatches, fitness trackers, and wearable tech",
          count: 15,
          tags: ["wearable", "fitness", "watch", "tracker"],
        })
      }

      // Combine all results and calculate relevance scores
      const allResults = [...productResults, ...streamResults, ...recordingResults, ...categoryResults].map(
        (result) => ({
          ...result,
          relevanceScore: calculateRelevanceScore(result, searchQuery),
        }),
      )

      // Sort by relevance score
      allResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

      setSearchResults(allResults)
      setIsProcessing(false)

      // Track search in analytics
      trackSearch(searchQuery, allResults.length)
    }, 500) // Simulate API delay
  }

  // Handle search submission
  const handleSearch = () => {
    performSearch(query)
  }

  // Handle voice search
  const handleVoiceSearch = () => {
    if (recognitionRef.current) {
      try {
        setIsListening(true)
        recognitionRef.current.start()
      } catch (error) {
        console.error("Speech recognition error:", error)
        setIsListening(false)
      }
    }
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    performSearch(suggestion)
  }

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search)
    performSearch(search)
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setOpen(false)

    if (result.type === "product") {
      router.push(`/products/${result.id}`)
    } else if (result.type === "stream") {
      router.push(`/streams/${result.id}`)
    } else if (result.type === "recording") {
      router.push(`/recordings/${result.id}`)
    } else if (result.type === "category") {
      router.push(`/products?category=${result.title}`)
    }
  }

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("recentSearches")
    }
  }

  // Filter results based on active tab
  const filteredResults =
    activeTab === "all" ? searchResults : searchResults.filter((result) => result.type === activeTab)

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <span className="sr-only">Search</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} className="max-w-3xl">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            ref={searchInputRef}
            placeholder="Search using natural language..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch()
              }
            }}
            className="flex-1"
          />
          {query && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuery("")}>
              <X className="h-4 w-4" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`ml-1 h-8 w-8 ${isListening ? "text-orange-500 animate-pulse" : ""}`}
            onClick={handleVoiceSearch}
            disabled={isListening}
          >
            <Mic className="h-4 w-4" />
            <span className="sr-only">Voice search</span>
          </Button>
          <Button variant="ghost" size="sm" className="ml-1 h-8" onClick={handleSearch}>
            Search
          </Button>
        </div>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {isListening ? (
            <span className="animate-pulse">Listening... Speak now</span>
          ) : (
            <span>
              Try natural language: "affordable wireless headphones with noise cancellation" or "smart home devices for
              beginners"
            </span>
          )}
        </div>

        {/* Recent searches */}
        {!query && recentSearches.length > 0 && (
          <div className="border-b px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Recent Searches</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearRecentSearches}>
                Clear
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 rounded-full text-xs"
                  onClick={() => handleRecentSearchClick(search)}
                >
                  <History className="h-3 w-3" />
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search suggestions */}
        {suggestions.length > 0 && query && (
          <div className="border-b px-3 py-2">
            <p className="mb-2 text-xs text-muted-foreground">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search intent */}
        {searchIntent && searchResults.length > 0 && (
          <div className="border-b px-3 py-2 flex items-center gap-2 bg-muted/50">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <p className="text-sm">
              <span className="font-medium">AI understood:</span> {searchIntent}
            </p>
          </div>
        )}

        {/* Loading state */}
        {isProcessing && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            <span className="ml-3 text-sm">Processing your search with AI...</span>
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && !isProcessing && (
          <>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="px-3 pt-3">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all" className="text-xs">
                  All Results ({searchResults.length})
                </TabsTrigger>
                <TabsTrigger value="product" className="text-xs">
                  Products ({searchResults.filter((r) => r.type === "product").length})
                </TabsTrigger>
                <TabsTrigger value="stream" className="text-xs">
                  Streams ({searchResults.filter((r) => r.type === "stream").length})
                </TabsTrigger>
                <TabsTrigger value="recording" className="text-xs">
                  Recordings ({searchResults.filter((r) => r.type === "recording").length})
                </TabsTrigger>
                <TabsTrigger value="category" className="text-xs">
                  Categories ({searchResults.filter((r) => r.type === "category").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ScrollArea className="h-[50vh] pb-4">
              <TabsContent value="all" className="mt-0">
                <CommandList>
                  {filteredResults.length > 0 ? (
                    <>
                      {filteredResults.some((r) => r.type === "product") && (
                        <CommandGroup heading="Products">
                          {filteredResults
                            .filter((r) => r.type === "product")
                            .map((result) => (
                              <CommandItem
                                key={result.id}
                                onSelect={() => handleResultClick(result)}
                                className="flex items-center py-3"
                              >
                                <div className="mr-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800">
                                  <Image
                                    src={result.image || "/placeholder.svg"}
                                    alt={result.title}
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="text-sm font-medium">{result.title}</h4>
                                  <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                                  {result.price && (
                                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                      ${result.price.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                                <div className="ml-2 flex flex-col items-end">
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  {result.relevanceScore && result.relevanceScore > 7 && (
                                    <span className="mt-1 flex items-center text-xs text-orange-500">
                                      <Sparkles className="mr-1 h-3 w-3" /> Best match
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}

                      {filteredResults.some((r) => r.type === "stream") && (
                        <CommandGroup heading="Streams">
                          {filteredResults
                            .filter((r) => r.type === "stream")
                            .map((result) => (
                              <CommandItem
                                key={result.id}
                                onSelect={() => handleResultClick(result)}
                                className="flex items-center py-3"
                              >
                                <div className="mr-3 flex h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-zinc-900">
                                  <Image
                                    src={result.image || "/placeholder.svg"}
                                    alt={result.title}
                                    width={96}
                                    height={64}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="text-sm font-medium">{result.title}</h4>
                                  <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                                  <p className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="mr-1 h-3 w-3" /> {result.date}
                                  </p>
                                </div>
                                <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}

                      {filteredResults.some((r) => r.type === "recording") && (
                        <CommandGroup heading="Recordings">
                          {filteredResults
                            .filter((r) => r.type === "recording")
                            .map((result) => (
                              <CommandItem
                                key={result.id}
                                onSelect={() => handleResultClick(result)}
                                className="flex items-center py-3"
                              >
                                <div className="mr-3 flex h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-zinc-900">
                                  <Image
                                    src={result.image || "/placeholder.svg"}
                                    alt={result.title}
                                    width={96}
                                    height={64}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="text-sm font-medium">{result.title}</h4>
                                  <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                                  <p className="flex items-center text-xs text-muted-foreground">
                                    <Clock className="mr-1 h-3 w-3" /> {result.date}
                                  </p>
                                </div>
                                <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}

                      {filteredResults.some((r) => r.type === "category") && (
                        <CommandGroup heading="Categories">
                          {filteredResults
                            .filter((r) => r.type === "category")
                            .map((result) => (
                              <CommandItem
                                key={result.id}
                                onSelect={() => handleResultClick(result)}
                                className="flex items-center py-3"
                              >
                                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                  <Tag className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="text-sm font-medium">{result.title}</h4>
                                  <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                                  <p className="text-xs text-muted-foreground">{result.count} products</p>
                                </div>
                                <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                    </>
                  ) : (
                    <CommandEmpty>No results found.</CommandEmpty>
                  )}
                </CommandList>
              </TabsContent>

              <TabsContent value="product" className="mt-0">
                <CommandList>
                  {filteredResults.length > 0 ? (
                    <CommandGroup>
                      {filteredResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleResultClick(result)}
                          className="flex items-center py-3"
                        >
                          <div className="mr-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800">
                            <Image
                              src={result.image || "/placeholder.svg"}
                              alt={result.title}
                              width={64}
                              height={64}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-medium">{result.title}</h4>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                            {result.price && (
                              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                ${result.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty>No product results found.</CommandEmpty>
                  )}
                </CommandList>
              </TabsContent>

              <TabsContent value="stream" className="mt-0">
                <CommandList>
                  {filteredResults.length > 0 ? (
                    <CommandGroup>
                      {filteredResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleResultClick(result)}
                          className="flex items-center py-3"
                        >
                          <div className="mr-3 flex h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-zinc-900">
                            <Image
                              src={result.image || "/placeholder.svg"}
                              alt={result.title}
                              width={96}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-medium">{result.title}</h4>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                            <p className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" /> {result.date}
                            </p>
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty>No stream results found.</CommandEmpty>
                  )}
                </CommandList>
              </TabsContent>

              <TabsContent value="recording" className="mt-0">
                <CommandList>
                  {filteredResults.length > 0 ? (
                    <CommandGroup>
                      {filteredResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleResultClick(result)}
                          className="flex items-center py-3"
                        >
                          <div className="mr-3 flex h-16 w-24 items-center justify-center overflow-hidden rounded-md bg-zinc-900">
                            <Image
                              src={result.image || "/placeholder.svg"}
                              alt={result.title}
                              width={96}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-medium">{result.title}</h4>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                            <p className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" /> {result.date}
                            </p>
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty>No recording results found.</CommandEmpty>
                  )}
                </CommandList>
              </TabsContent>

              <TabsContent value="category" className="mt-0">
                <CommandList>
                  {filteredResults.length > 0 ? (
                    <CommandGroup>
                      {filteredResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleResultClick(result)}
                          className="flex items-center py-3"
                        >
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            <Tag className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-medium">{result.title}</h4>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                            <p className="text-xs text-muted-foreground">{result.count} products</p>
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty>No category results found.</CommandEmpty>
                  )}
                </CommandList>
              </TabsContent>
            </ScrollArea>
          </>
        )}

        {/* No results state */}
        {query && searchResults.length === 0 && !isProcessing && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-sm font-medium">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter to find what you're looking for.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!query && searchResults.length === 0 && !isProcessing && recentSearches.length === 0 && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mb-1 text-sm font-medium">AI-Powered Search</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Use natural language to find exactly what you're looking for
            </p>
            <div className="mx-auto max-w-md space-y-2 text-left">
              <p className="text-xs font-medium">Try searching for:</p>
              <Button
                variant="outline"
                size="sm"
                className="mr-2 h-7 text-xs"
                onClick={() => handleSuggestionClick("affordable wireless earbuds with noise cancellation")}
              >
                "affordable wireless earbuds with noise cancellation"
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="mr-2 h-7 text-xs"
                onClick={() => handleSuggestionClick("smart home devices for beginners")}
              >
                "smart home devices for beginners"
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleSuggestionClick("portable tech for travel under $100")}
              >
                "portable tech for travel under $100"
              </Button>
            </div>
          </div>
        )}
      </CommandDialog>
    </>
  )
}
