"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Upload, Search, Check, X, Sparkles, RefreshCw, Trash2, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BACKGROUND_CATALOG,
  BACKGROUND_CATEGORIES,
  UPLOADS_STORAGE_KEY,
  type BackgroundAsset,
  type BackgroundCategoryId,
} from "./backgrounds/catalog"

interface UploadPayload {
  id: string
  name: string
  url: string
  createdAt: string
}

interface VirtualBackgroundsProps {
  onSelectBackground?: (background: string | null) => void
  onBlurBackground?: (amount: number) => void
  selectedBackground?: string | null
  blurAmount?: number
  onPersistUpload?: (upload: UploadPayload) => Promise<void> | void
}

export default function VirtualBackgrounds({
  onSelectBackground = () => {},
  onBlurBackground = () => {},
  selectedBackground = null,
  blurAmount = 0,
  onPersistUpload,
}: VirtualBackgroundsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<BackgroundCategoryId>("featured")
  const [customUploads, setCustomUploads] = useState<BackgroundAsset[]>([])
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [retrySeed, setRetrySeed] = useState<Record<string, number>>({})
  const [removedIds, setRemovedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const saved = localStorage.getItem(UPLOADS_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as UploadPayload[]
      const mappedUploads: BackgroundAsset[] = parsed.map((upload) => ({
        id: upload.id,
        name: upload.name,
        url: upload.url,
        categories: ["custom"],
      }))
      setCustomUploads(mappedUploads)
    } catch {
      setCustomUploads([])
    }
  }, [])

  const backgroundsByCategory = useMemo(() => {
    const allBackgrounds = [...BACKGROUND_CATALOG, ...customUploads].filter((item) => !removedIds[item.id])

    return BACKGROUND_CATEGORIES.reduce<Record<BackgroundCategoryId, BackgroundAsset[]>>(
      (acc, category) => {
        acc[category.id] =
          category.id === "custom"
            ? customUploads.filter((item) => !removedIds[item.id])
            : allBackgrounds.filter((item) => item.categories.includes(category.id))
        return acc
      },
      {
        featured: [],
        office: [],
        nature: [],
        abstract: [],
        gradients: [],
        tech: [],
        custom: [],
      },
    )
  }, [customUploads, removedIds])

  const filteredBackgrounds = useMemo(
    () =>
      (backgroundsByCategory[activeCategory] || []).filter((bg) =>
        bg.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
      ),
    [activeCategory, backgroundsByCategory, searchQuery],
  )

  const handleBackgroundSelect = (url: string) => {
    onSelectBackground(url === selectedBackground ? null : url)
  }

  const handleBlurChange = (value: number[]) => {
    onBlurBackground(value[0])
  }

  const persistCustomUploads = (uploads: BackgroundAsset[]) => {
    const payload: UploadPayload[] = uploads.map((upload) => ({
      id: upload.id,
      name: upload.name,
      url: upload.url,
      createdAt: new Date().toISOString(),
    }))
    localStorage.setItem(UPLOADS_STORAGE_KEY, JSON.stringify(payload))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileAsDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Could not read image file"))
      reader.readAsDataURL(file)
    })

    const uploadedAsset: BackgroundAsset = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: fileAsDataUrl,
      categories: ["custom"],
    }

    setCustomUploads((prev) => {
      const next = [uploadedAsset, ...prev]
      persistCustomUploads(next)
      return next
    })

    if (onPersistUpload) {
      await onPersistUpload({
        id: uploadedAsset.id,
        name: uploadedAsset.name,
        url: uploadedAsset.url,
        createdAt: new Date().toISOString(),
      })
    }

    setActiveCategory("custom")
    onSelectBackground(uploadedAsset.url)
    e.target.value = ""
  }

  const retryImage = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: false }))
    setRetrySeed((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  const removeBackground = (background: BackgroundAsset) => {
    setRemovedIds((prev) => ({ ...prev, [background.id]: true }))
    if (selectedBackground === background.url) {
      onSelectBackground(null)
    }

    if (background.categories.includes("custom")) {
      setCustomUploads((prev) => {
        const next = prev.filter((item) => item.id !== background.id)
        persistCustomUploads(next)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Virtual Backgrounds</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-white dark:text-orange-300 dark:hover:from-orange-950/40 dark:hover:to-slate-900"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            AI Generate
          </Button>
          <label htmlFor="upload-background" className="cursor-pointer">
            <div className="flex items-center space-x-1 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 px-2 py-1 text-sm font-medium text-white transition hover:opacity-90">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </div>
            <Input id="upload-background" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Input
          type="search"
          placeholder="Search backgrounds..."
          className="border-orange-200 pl-8 focus-visible:ring-orange-400 dark:border-orange-900"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="featured" value={activeCategory} onValueChange={(value) => setActiveCategory(value as BackgroundCategoryId)}>
        <TabsList className="grid h-auto grid-cols-4 bg-orange-50/70 dark:bg-orange-950/20">
          {BACKGROUND_CATEGORIES.slice(0, 4).map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-700 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-orange-300">
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="mt-2 grid h-auto grid-cols-3 bg-orange-50/70 dark:bg-orange-950/20">
          {BACKGROUND_CATEGORIES.slice(4).map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs data-[state=active]:bg-white data-[state=active]:text-orange-700 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-orange-300">
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {BACKGROUND_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-4">
            {filteredBackgrounds.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredBackgrounds.map((background) => {
                  const hasError = imageErrors[background.id]
                  const imageSrc = `${background.url}${background.url.includes("?") ? "&" : "?"}r=${retrySeed[background.id] || 0}`
                  return (
                    <div
                      key={background.id}
                      className={cn(
                        "relative aspect-video overflow-hidden rounded-md border-2 transition",
                        selectedBackground === background.url
                          ? "border-orange-500"
                          : "border-transparent hover:border-orange-300",
                      )}
                    >
                      {!hasError ? (
                        <button className="h-full w-full" onClick={() => handleBackgroundSelect(background.url)}>
                          <img
                            src={imageSrc}
                            alt={background.name}
                            className="h-full w-full object-cover"
                            onError={() => setImageErrors((prev) => ({ ...prev, [background.id]: true }))}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                            <span className="text-xs font-medium text-white">{background.name}</span>
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-100 to-gray-200 px-2 text-center dark:from-gray-900 dark:to-gray-800">
                          <ImageOff className="h-5 w-5 text-orange-500" />
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-200">Thumbnail unavailable</p>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => retryImage(background.id)}>
                              <RefreshCw className="mr-1 h-3 w-3" /> Retry
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => removeBackground(background)}>
                              <Trash2 className="mr-1 h-3 w-3" /> Remove
                            </Button>
                          </div>
                        </div>
                      )}

                      {selectedBackground === background.url && !hasError && (
                        <div className="absolute right-2 top-2 rounded-full bg-orange-500 p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No backgrounds found</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-2 border-t border-orange-100 pt-4 dark:border-orange-900/40">
        <div className="flex items-center justify-between">
          <Label htmlFor="blur-slider">Background Blur</Label>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onSelectBackground(null)} disabled={!selectedBackground}>
            <X className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
        <Slider id="blur-slider" value={[blurAmount]} max={20} step={1} onValueChange={handleBlurChange} disabled={!selectedBackground} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>None</span>
          <span>Max</span>
        </div>
      </div>
    </div>
  )
}
