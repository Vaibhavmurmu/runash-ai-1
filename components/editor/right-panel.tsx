"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Zap, SlidersHorizontal } from "lucide-react"
import StreamManager from "./stream-manager"
import ModelSelector from "./model-selector"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface RightPanelProps {
  selectedModel: string
  onModelChange: (model: string) => void
  activeTab?: string
}

export default function RightPanel({ selectedModel, onModelChange, activeTab }: RightPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)
  const showStreamManager = activeTab === "stream"
  const showModelSelector = activeTab === "generate"

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)")
    const sync = () => setIsNarrowViewport(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  const models = useMemo(
    () => [
      { id: "wan-2.1", name: "WAN 2.1", desc: "Latest model", tier: "Pro" },
      { id: "gpt-4", name: "GPT-4", desc: "General purpose", tier: "Pro" },
      { id: "claude", name: "Claude", desc: "Fast & efficient", tier: "Pro" },
    ],
    [],
  )

  const panelContent = showStreamManager ? (
    <div className="h-full min-h-0"> 
      <StreamManager />
    </div>
  ) : showModelSelector ? (
    <div className="p-4">
      <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
    </div>
  ) : (
    <Tabs defaultValue="models" className="w-full h-full flex flex-col">
      <TabsList className="w-full rounded-none border-b bg-transparent">
        <TabsTrigger value="models" className="flex-1">
          Models
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex-1">
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="models" className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold px-2">Available Models</h3>
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id)
                setMobileOpen(false)
              }}
              className={`w-full p-3 rounded-lg border transition-all text-left ${
                selectedModel === model.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
              aria-label={`Select ${model.name}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.desc}</div>
                </div>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">{model.tier}</span>
              </div>
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Generation Settings</h3>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="duration-slider">
              Duration
            </label>
            <input
              id="duration-slider"
              type="range"
              min="5"
              max="60"
              step="5"
              className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-xs text-muted-foreground">5 - 60 seconds</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="quality-select">
              Quality
            </label>
            <select id="quality-select" className="w-full px-3 py-3 rounded-lg border border-border bg-background text-sm">
              <option>1080p (High)</option>
              <option>720p (Medium)</option>
              <option>480p (Low)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="style-select">
              Style
            </label>
            <select id="style-select" className="w-full px-3 py-3 rounded-lg border border-border bg-background text-sm">
              <option>Cinematic</option>
              <option>Documentary</option>
              <option>Animated</option>
            </select>
          </div>
        </div>

        <Button className="w-full gap-2 h-11">
          <Zap className="w-4 h-4" />
          Generate
        </Button>
      </TabsContent>
    </Tabs>
  )

  return (
    <>
      <aside className="hidden lg:block w-80 xl:w-96 2xl:w-[28rem] bg-card border-l border-border overflow-y-auto">
        {panelContent}
      </aside>

      {isNarrowViewport && (
        <div className="fixed bottom-36 right-4 z-30">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="h-12 w-12 rounded-full shadow-lg" aria-label="Open model and settings panel">
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[92vw] max-w-md p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle>Project controls</SheetTitle>
                <SheetDescription>Models, generation settings, and stream controls.</SheetDescription>
              </SheetHeader>
              <div className="h-[calc(100%-4.5rem)] overflow-y-auto">{panelContent}</div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  )
}
