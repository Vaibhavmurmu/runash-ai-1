"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowRight, Clock, History, Mic, Search, Sparkles, Tag, X } from "lucide-react"

import { useAnalytics } from "@/components/analytics-provider"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface SearchApiResponse {
  success?: boolean
  data?: {
    intent?: string | null
    suggestions?: string[]
    results?: SearchResult[]
  }
  error?: { message?: string }
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
  const [searchError, setSearchError] = useState<string | null>(null)

  const router = useRouter()
  const { trackSearch } = useAnalytics()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedSearches = localStorage.getItem("recentSearches")
      if (savedSearches) setRecentSearches(JSON.parse(savedSearches))
    } catch {
      // ignore local storage failures
    }
  }, [])

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return
    try {
      const updatedSearches = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5)
      setRecentSearches(updatedSearches)
      if (typeof window !== "undefined") {
        localStorage.setItem("recentSearches", JSON.stringify(updatedSearches))
      }
    } catch {
      // ignore local storage failures
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore browser API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
        void performSearch(transcript)
      }
      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }

    return () => recognitionRef.current?.abort()
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((value) => !value)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
      return
    }

    setSearchResults([])
    setSearchError(null)
    setQuery("")
    setSearchIntent(null)
  }, [open])

  const fetchSuggestions = async (value: string) => {
    if (value.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const params = new URLSearchParams({ query: value, limit: "5" })
      const response = await fetch(`/api/search?${params.toString()}`, { cache: "no-store", credentials: "include" })
      const payload = (await response.json().catch(() => null)) as SearchApiResponse | null
      if (!response.ok || !payload?.data) {
        setSuggestions([])
        return
      }
      setSuggestions(payload.data.suggestions ?? [])
    } catch {
      setSuggestions([])
    }
  }

  useEffect(() => {
    void fetchSuggestions(query)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    setIsProcessing(true)
    setSearchError(null)
    saveRecentSearch(searchQuery)

    try {
      const params = new URLSearchParams({ query: searchQuery, limit: "24" })
      const response = await fetch(`/api/search?${params.toString()}`, { cache: "no-store", credentials: "include" })
      const payload = (await response.json().catch(() => null)) as SearchApiResponse | null

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message || `Search request failed (${response.status})`)
      }

      const results = payload.data.results ?? []
      setSearchResults(results)
      setSearchIntent(payload.data.intent ?? null)
      trackSearch(searchQuery, results.length)
    } catch (error) {
      setSearchResults([])
      setSearchIntent(null)
      setSearchError(error instanceof Error ? error.message : "Search failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredResults = useMemo(
    () => (activeTab === "all" ? searchResults : searchResults.filter((result) => result.type === activeTab)),
    [activeTab, searchResults],
  )

  const handleResultClick = (result: SearchResult) => {
    setOpen(false)
    if (result.type === "product") router.push(`/products/${result.id}`)
    else if (result.type === "stream") router.push(`/streams/${result.id}`)
    else if (result.type === "recording") router.push(`/recordings/${result.id}`)
    else router.push(`/products?category=${result.title}`)
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} className="max-w-3xl">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            ref={searchInputRef}
            placeholder="Search using natural language..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => e.key === "Enter" && void performSearch(query)}
            className="flex-1"
          />
          {query && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`ml-1 h-8 w-8 ${isListening ? "text-orange-500 animate-pulse" : ""}`}
            onClick={() => {
              try {
                setIsListening(true)
                recognitionRef.current?.start()
              } catch {
                setIsListening(false)
              }
            }}
            disabled={isListening}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="ml-1 h-8" onClick={() => void performSearch(query)}>
            Search
          </Button>
        </div>

        {!query && recentSearches.length > 0 && (
          <div className="border-b px-3 py-2">
            <p className="text-xs text-muted-foreground">Recent Searches</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentSearches.map((search) => (
                <Button key={search} variant="outline" size="sm" onClick={() => void performSearch(search)}>
                  <History className="mr-1 h-3 w-3" /> {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && !isProcessing && (
          <div className="border-b px-3 py-2">
            <p className="text-xs text-muted-foreground">Suggestions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button key={suggestion} variant="secondary" size="sm" onClick={() => void performSearch(suggestion)}>
                  <Sparkles className="mr-1 h-3 w-3" /> {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mx-3 my-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="product">Products</TabsTrigger>
            <TabsTrigger value="stream">Streams</TabsTrigger>
            <TabsTrigger value="recording">Recordings</TabsTrigger>
            <TabsTrigger value="category">Categories</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-0">
            <CommandList>
              {searchError && <p className="px-3 py-2 text-xs text-red-600">{searchError}</p>}
              {isProcessing && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
              {!isProcessing && !searchError && searchResults.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
              <ScrollArea className="max-h-[420px]">
                {searchIntent && <p className="px-3 py-2 text-xs text-muted-foreground">Intent: {searchIntent}</p>}
                {filteredResults.length > 0 && (
                  <CommandGroup heading="Results">
                    {filteredResults.map((result) => (
                      <CommandItem key={`${result.type}-${result.id}`} onSelect={() => handleResultClick(result)}>
                        {result.type === "category" ? <Tag className="mr-2 h-4 w-4" /> : null}
                        {result.image ? <Image src={result.image} alt={result.title} width={48} height={32} className="mr-2 rounded" /> : null}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{result.title}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{result.description}</p>
                          {result.date && <p className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{result.date}</p>}
                          {typeof result.price === "number" && <p className="text-xs">${result.price.toFixed(2)}</p>}
                        </div>
                        <ArrowRight className="ml-2 h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </ScrollArea>
            </CommandList>
          </TabsContent>
        </Tabs>
      </CommandDialog>
    </>
  )
}
