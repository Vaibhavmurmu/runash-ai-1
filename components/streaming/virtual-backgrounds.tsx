"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Search, Check, X, Sparkles, RefreshCw, Trash2, ImageOff, Loader2, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useStreamBackgrounds } from "@/hooks/use-stream-backgrounds"

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
  selectedBackground,
  blurAmount,
  onPersistUpload,
}: VirtualBackgroundsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("featured")
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [retrySeed, setRetrySeed] = useState<Record<string, number>>({})
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiStyle, setAiStyle] = useState("cinematic")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [internalSelectedBackground, setInternalSelectedBackground] = useState<string | null>(selectedBackground ?? null)
  const [internalBlurAmount, setInternalBlurAmount] = useState(blurAmount ?? 0)
  const { data: backgrounds, loading, error, upload, remove, refresh } = useStreamBackgrounds("studio-default")

  useEffect(() => {
    if (selectedBackground !== undefined) setInternalSelectedBackground(selectedBackground ?? null)
  }, [selectedBackground])

  useEffect(() => {
    if (typeof blurAmount === "number") setInternalBlurAmount(blurAmount)
  }, [blurAmount])

  const currentSelectedBackground = selectedBackground !== undefined ? (selectedBackground ?? null) : internalSelectedBackground
  const currentBlurAmount = typeof blurAmount === "number" ? blurAmount : internalBlurAmount

  const categories = ["featured", "office", "nature", "abstract", "gradients", "tech", "custom"]

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return backgrounds.filter((bg) => {
      const categoryMatch = activeCategory === "featured" ? true : bg.category.includes(activeCategory)
      const queryMatch = q ? bg.name.toLowerCase().includes(q) : true
      return categoryMatch && queryMatch
    })
  }, [activeCategory, backgrounds, searchQuery])

  const handleBlurChange = (value: number[]) => {
    const nextValue = value[0] ?? 0
    setInternalBlurAmount(nextValue)
    onBlurBackground?.(nextValue)
  }

  const handleBackgroundSelect = (url: string) => {
    const next = url === currentSelectedBackground ? null : url
    if (selectedBackground === undefined) setInternalSelectedBackground(next)
    onSelectBackground(next)
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

    const uploadedAsset = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: fileAsDataUrl,
      thumbnailUrl: fileAsDataUrl,
      category: ["custom"],
      tags: ["custom"],
      isPremium: false,
    }

    await upload(uploadedAsset)
    if (onPersistUpload) {
      await onPersistUpload({ id: uploadedAsset.id, name: uploadedAsset.name, url: uploadedAsset.url, createdAt: new Date().toISOString() })
    }
    setActiveCategory("custom")
    handleBackgroundSelect(uploadedAsset.url)
    e.target.value = ""
  }

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return
    setIsGeneratingAI(true)
    try {
      const generated = {
        id: `custom-ai-${Date.now()}`,
        name: `${aiStyle} · ${aiPrompt.slice(0, 32)}`,
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><rect width='1280' height='720' fill='#f97316'/><text x='72' y='598' fill='white' font-size='32'>${aiPrompt.replace(/[<>&]/g, "")}</text><text x='72' y='650' fill='white' font-size='22'>AI style: ${aiStyle}</text></svg>`)}`,
        thumbnailUrl: "",
        category: ["custom"],
        tags: ["ai", aiStyle],
        isPremium: false,
      }
      await upload(generated)
      setActiveCategory("custom")
      handleBackgroundSelect(generated.url)
      setIsAIDialogOpen(false)
      setAiPrompt("")
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const retryImage = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: false }))
    setRetrySeed((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Virtual Backgrounds</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAIDialogOpen(true)}><Sparkles className="mr-1 h-4 w-4" />AI</Button>
          <Label htmlFor="custom-bg-upload" className="inline-flex"><Button size="sm" variant="outline" asChild><span><Upload className="mr-1 h-4 w-4" />Upload</span></Button></Label>
          <Input id="custom-bg-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Background</DialogTitle>
            <DialogDescription>Create a custom AI background for your stream.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe your background..." />
            <Input value={aiStyle} onChange={(e) => setAiStyle(e.target.value)} placeholder="Style" />
          </div>
          <DialogFooter>
            <Button onClick={() => void handleAIGenerate()} disabled={isGeneratingAI || !aiPrompt.trim()}>{isGeneratingAI ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input type="search" placeholder="Search backgrounds..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading backgrounds...</p> : null}
      {error ? <p className="text-sm text-red-500">{error} <Button variant="link" onClick={() => void refresh()}>Retry</Button></p> : null}
      {!loading && !error && backgrounds.length === 0 ? <p className="text-sm text-muted-foreground">No backgrounds available yet.</p> : null}

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid h-auto grid-cols-4">
          {categories.slice(0, 4).map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">{category}</TabsTrigger>
          ))}
        </TabsList>
        <TabsList className="mt-2 grid h-auto grid-cols-3">
          {categories.slice(4).map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">{category}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((background) => {
                  const hasError = imageErrors[background.id]
                  const imageSrc = `${background.thumbnailUrl || background.url}${(background.thumbnailUrl || background.url).includes("?") ? "&" : "?"}r=${retrySeed[background.id] || 0}`
                  return (
                    <div key={background.id} className={cn("relative aspect-video overflow-hidden rounded-md border-2 transition", currentSelectedBackground === background.url ? "border-orange-500" : "border-transparent hover:border-orange-300")}>
                      {!hasError ? (
                        <button className="h-full w-full" onClick={() => handleBackgroundSelect(background.url)}>
                          <img src={imageSrc} alt={background.name} className="h-full w-full object-cover" onError={() => setImageErrors((prev) => ({ ...prev, [background.id]: true }))} />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100"><span className="text-xs font-medium text-white">{background.name}</span></div>
                        </button>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-100 to-gray-200 px-2 text-center">
                          <ImageOff className="h-5 w-5 text-orange-500" />
                          <p className="text-xs font-medium text-gray-700">Thumbnail unavailable</p>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => retryImage(background.id)}><RefreshCw className="mr-1 h-3 w-3" /> Retry</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => void remove(background.id)}><Trash2 className="mr-1 h-3 w-3" /> Remove</Button>
                          </div>
                        </div>
                      )}
                      {currentSelectedBackground === background.url && !hasError && <div className="absolute right-2 top-2 rounded-full bg-orange-500 p-0.5"><Check className="h-3 w-3 text-white" /></div>}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center"><p className="text-gray-500">No backgrounds found</p></div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-2 border-t border-orange-100 pt-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="blur-slider">Background Blur</Label>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onSelectBackground(null)} disabled={!currentSelectedBackground}>
            <X className="mr-1 h-3 w-3" />Remove
          </Button>
        </div>
        <Slider id="blur-slider" value={[currentBlurAmount]} max={20} step={1} onValueChange={handleBlurChange} disabled={!currentSelectedBackground} />
      </div>
    </div>
  )
}
