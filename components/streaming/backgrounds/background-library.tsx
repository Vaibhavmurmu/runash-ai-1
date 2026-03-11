"use client"

import { useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import type { BackgroundFilter } from "@/types/virtual-backgrounds"
import BackgroundGrid from "./background-grid"
import BackgroundCollections from "./background-collections"
import BackgroundUploader from "./background-uploader"
import AIBackgroundGenerator from "./ai-background-generator"
import BackgroundFilters from "./background-filters"
import { Search, Clock, Grid3X3 } from "lucide-react"
import { useStreamBackgrounds } from "@/hooks/use-stream-backgrounds"

interface BackgroundLibraryProps {
  streamId?: string
}

export default function BackgroundLibrary({ streamId = "studio-default" }: BackgroundLibraryProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("browse")
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<BackgroundFilter>({ sortBy: "newest" })
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { data: backgrounds, loading, error, save, refresh } = useStreamBackgrounds(streamId)

  const filteredBackgrounds = useMemo(() => {
    let filtered = [...backgrounds]

    if (searchQuery) {
      filtered = filtered.filter(
        (bg) =>
          bg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bg.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter((bg) => filters.categories?.some((category) => bg.category.includes(category)))
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((bg) => filters.tags?.some((tag) => bg.tags.includes(tag)))
    }

    if (filters.isPremium !== undefined) {
      filtered = filtered.filter((bg) => bg.isPremium === filters.isPremium)
    }

    if (filters.sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (filters.sortBy === "popular") {
      filtered.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
    } else if (filters.sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    }

    return filtered
  }, [backgrounds, filters, searchQuery])

  const handleFilterChange = (newFilters: Partial<BackgroundFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handleBackgroundSelect = () => {
    toast({ title: "Background Selected", description: "Background has been applied to your stream." })
  }

  const handleBackgroundDownload = async (backgroundId: string) => {
    await save(backgroundId, { downloadCount: (backgrounds.find((item) => item.id === backgroundId)?.downloadCount ?? 0) + 1 })
    toast({ title: "Background Downloaded", description: "Background download count updated." })
  }

  const handleBackgroundSave = async (backgroundId: string) => {
    await save(backgroundId, { isSaved: true })
    toast({ title: "Background Saved", description: "Background has been added to your collection." })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Virtual Background Library</h1>
        <p className="text-muted-foreground">Enhance your streams with professional virtual backgrounds</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-3/4">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search backgrounds..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="hidden md:flex">
              {viewMode === "grid" ? <Grid3X3 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 md:w-[400px]">
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="ai">AI Generate</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="space-y-4 mt-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading backgrounds...</div>
              ) : error ? (
                <div className="py-12 text-center text-sm text-red-500">
                  {error}
                  <Button variant="link" onClick={() => void refresh()}>Retry</Button>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="w-full md:w-1/4">
                    <BackgroundFilters onFilterChange={handleFilterChange} />
                  </div>
                  <div className="w-full md:w-3/4">
                    <BackgroundGrid
                      backgrounds={filteredBackgrounds}
                      viewMode={viewMode}
                      onSelect={handleBackgroundSelect}
                      onDownload={(id) => void handleBackgroundDownload(id)}
                      onSave={(id) => void handleBackgroundSave(id)}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="collections" className="space-y-4 mt-4">
              <BackgroundCollections streamId={streamId} />
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <AIBackgroundGenerator />
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <BackgroundUploader streamId={streamId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
