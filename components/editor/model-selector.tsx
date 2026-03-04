"use client"

import { useState } from "react"
import { ChevronDown, Zap, TrendingUp, Info, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ModelConfig {
  id: string
  name: string
  provider: string
  tier: "Free" | "Pro" | "Enterprise"
  speed: number // 1-10
  quality: number // 1-10
  cost: number // $ per 1000 requests
  description: string
  features: string[]
  maxDuration: number // seconds
  supportedFormats: string[]
}

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [customConfig, setCustomConfig] = useState({
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    presencePenalty: 0,
    frequencyPenalty: 0,
  })

  const models: ModelConfig[] = [
    {
      id: "wan-2.1",
      name: "WAN 2.1",
      provider: "RunAsh",
      tier: "Pro",
      speed: 9,
      quality: 10,
      cost: 0.08,
      description: "Latest generation AI model with superior video generation quality",
      features: ["4K Support", "Real-time Processing", "Advanced Effects"],
      maxDuration: 600,
      supportedFormats: ["MP4", "WebM", "MOV", "AVI"],
    },
    {
      id: "runway-gen3",
      name: "Runway Gen-3",
      provider: "Runway",
      tier: "Pro",
      speed: 8,
      quality: 8,
      cost: 0.11,
      description: "High-speed iteration for concept and preview renders",
      features: ["Fast Iteration", "Prompt Control", "Preview Friendly"],
      maxDuration: 300,
      supportedFormats: ["MP4", "WebM"],
    },
    {
      id: "stability-video",
      name: "Stability Video",
      provider: "Stability",
      tier: "Pro",
      speed: 7,
      quality: 8,
      cost: 0.09,
      description: "Reliable generation tuned for consistent visual coherence",
      features: ["Coherent Motion", "Style Transfer", "Efficient Render"],
      maxDuration: 180,
      supportedFormats: ["MP4", "WebM"],
    },
  ]

  const selected = models.find((m) => m.id === selectedModel) || models[0]

  const getModelScore = (model: ModelConfig) => {
    return Math.round((model.quality * 0.6 + model.speed * 0.4) * 10)
  }

  return (
    <div className="w-full space-y-4">
      {/* Model selector dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">AI Model</label>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 rounded-lg border border-border hover:border-primary/50 transition-colors bg-background text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/50 to-accent/50 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.provider}</p>
            </div>
          </div>
          <Badge variant="outline" className="ml-2 flex-shrink-0">
            {selected.tier}
          </Badge>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Expanded model list */}
        {isExpanded && (
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id)
                  setIsExpanded(false)
                }}
                className={`w-full p-3 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/50 text-left ${
                  selectedModel === model.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{model.name}</p>
                      <Badge variant={model.tier === "Free" ? "secondary" : "default"} className="text-xs">
                        {model.tier}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{model.provider}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{getModelScore(model)}/100</p>
                      <p className="text-xs text-muted-foreground">${model.cost}</p>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Speed</span>
                    <div className="flex gap-0.5">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 w-1.5 rounded-full ${i < model.speed ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Quality</span>
                    <div className="flex gap-0.5">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 w-1.5 rounded-full ${i < model.quality ? "bg-accent" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model details */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="gap-2">
              <Info className="w-4 h-4" />
              Info
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Config
            </TabsTrigger>
          </TabsList>

          {/* Info tab */}
          <TabsContent value="info" className="space-y-3">
            <p className="text-sm text-foreground/80">{selected.description}</p>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Features</h4>
              <div className="flex flex-wrap gap-2">
                {selected.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded p-2">
                <p className="text-xs text-muted-foreground">Max Duration</p>
                <p className="font-semibold text-foreground">
                  {Math.floor(selected.maxDuration / 60)}m {selected.maxDuration % 60}s
                </p>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <p className="text-xs text-muted-foreground">Formats</p>
                <p className="font-semibold text-foreground text-xs">
                  {selected.supportedFormats.slice(0, 2).join(", ")}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Configuration tab */}
          <TabsContent value="config" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Temperature</label>
                <span className="text-xs font-semibold text-foreground">{customConfig.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={customConfig.temperature}
                onChange={(e) =>
                  setCustomConfig((prev) => ({
                    ...prev,
                    temperature: Number.parseFloat(e.target.value),
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Controls creativity</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Top P</label>
                <span className="text-xs font-semibold text-foreground">{customConfig.topP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={customConfig.topP}
                onChange={(e) =>
                  setCustomConfig((prev) => ({
                    ...prev,
                    topP: Number.parseFloat(e.target.value),
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Nucleus sampling</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Max Tokens</label>
                <span className="text-xs font-semibold text-foreground">{customConfig.maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="256"
                value={customConfig.maxTokens}
                onChange={(e) =>
                  setCustomConfig((prev) => ({
                    ...prev,
                    maxTokens: Number.parseInt(e.target.value),
                  }))
                }
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Comparison info */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Performance Score
          </span>
          <span className="font-semibold text-foreground">{getModelScore(selected)}/100</span>
        </div>
        <div className="w-full h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${getModelScore(selected)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
