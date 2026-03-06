"use client"

import { useEffect, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import StreamManager from "./stream-manager"
import ModelSelector from "./model-selector"
import EditPanel from "./edit-panel"
import LayersPanel from "./layers-panel"
import { isRightPanelTabId, type RightPanelTabId } from "./panel-tabs"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { VideoGenerationRequest } from "@/lib/editor/video-models/types"
import { getVideoModelMetadata } from "@/lib/editor/video-models/registry"

interface RightPanelProps {
  selectedModel: string
  onModelChange: (model: string) => void
  generationConfig: VideoGenerationRequest
  validationErrors: Record<string, string>
  onGenerationConfigChange: (config: VideoGenerationRequest) => void
  activeTab?: string
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

function parseOptionalInteger(value: string): number | undefined {
  if (value.trim().length === 0) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

export default function RightPanel({
  selectedModel,
  onModelChange,
  generationConfig,
  validationErrors,
  onGenerationConfigChange,
  activeTab,
}: RightPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)
  const resolvedTab: RightPanelTabId = activeTab && isRightPanelTabId(activeTab) ? activeTab : "generate"
  const model = getVideoModelMetadata(selectedModel)

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)")
    const sync = () => setIsNarrowViewport(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  const generatePanel = (
    <div className="space-y-5 p-4">
      <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">Generation config</h3>
          <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="gen-prompt" className="text-xs font-medium text-muted-foreground">Prompt</label>
          <Textarea
            id="gen-prompt"
            value={String(generationConfig.prompt ?? "")}
            onChange={(event) => onGenerationConfigChange({ ...generationConfig, prompt: event.target.value })}
            placeholder="Describe the video you want to generate"
          />
          <FieldError message={validationErrors.prompt} />
        </div>

        <div className="space-y-2">
          <label htmlFor="gen-negative-prompt" className="text-xs font-medium text-muted-foreground">Negative prompt</label>
          <Textarea
            id="gen-negative-prompt"
            value={String(generationConfig.negativePrompt ?? "")}
            onChange={(event) => onGenerationConfigChange({ ...generationConfig, negativePrompt: event.target.value })}
            placeholder="Things you want to avoid"
          />
          <FieldError message={validationErrors.negativePrompt} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="gen-aspect" className="text-xs font-medium text-muted-foreground">Aspect ratio</label>
            <select
              id="gen-aspect"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              value={String(generationConfig.aspectRatio ?? "")}
              onChange={(event) => onGenerationConfigChange({ ...generationConfig, aspectRatio: event.target.value })}
            >
              {model.supportedAspectRatios.map((aspectRatio) => (
                <option key={aspectRatio} value={aspectRatio}>
                  {aspectRatio}
                </option>
              ))}
            </select>
            <FieldError message={validationErrors.aspectRatio} />
          </div>

          <div className="space-y-2">
            <label htmlFor="gen-resolution" className="text-xs font-medium text-muted-foreground">Resolution</label>
            <select
              id="gen-resolution"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              value={String(generationConfig.resolution ?? "")}
              onChange={(event) => onGenerationConfigChange({ ...generationConfig, resolution: event.target.value })}
            >
              {model.supportedResolutions.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
            <FieldError message={validationErrors.resolution} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="gen-fps" className="text-xs font-medium text-muted-foreground">FPS</label>
            <Input
              id="gen-fps"
              type="number"
              min={model.fpsRange.min}
              max={model.fpsRange.max}
              value={String(generationConfig.fps ?? "")}
              onChange={(event) => onGenerationConfigChange({ ...generationConfig, fps: parseOptionalInteger(event.target.value) })}
            />
            <FieldError message={validationErrors.fps} />
          </div>

          <div className="space-y-2">
            <label htmlFor="gen-duration-preset" className="text-xs font-medium text-muted-foreground">Duration</label>
            <select
              id="gen-duration-preset"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              value={String(generationConfig.durationPreset ?? "")}
              onChange={(event) => {
                const selectedPreset = model.durationPresetOptions.find((entry) => entry.id === event.target.value)
                onGenerationConfigChange({
                  ...generationConfig,
                  durationPreset: event.target.value,
                  durationSeconds: selectedPreset?.seconds ?? generationConfig.durationSeconds,
                })
              }}
            >
              {model.durationPresetOptions.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <FieldError message={validationErrors.durationPreset} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="gen-seed" className="text-xs font-medium text-muted-foreground">Seed</label>
            <Input
              id="gen-seed"
              type="number"
              min={0}
              step={1}
              value={String(generationConfig.seed ?? "")}
              onChange={(event) => onGenerationConfigChange({ ...generationConfig, seed: parseOptionalInteger(event.target.value) })}
            />
            <FieldError message={validationErrors.seed} />
          </div>

          <div className="space-y-2">
            <label htmlFor="gen-quality-mode" className="text-xs font-medium text-muted-foreground">Quality mode</label>
            <select
              id="gen-quality-mode"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              value={String(generationConfig.qualityMode ?? "")}
              onChange={(event) =>
                onGenerationConfigChange({
                  ...generationConfig,
                  qualityMode: event.target.value === "speed" ? "speed" : "quality",
                })
              }
            >
              <option value="quality">Quality</option>
              <option value="speed">Speed</option>
            </select>
            <FieldError message={validationErrors.qualityMode} />
          </div>
        </div>
      </div>
    </div>
  )

  function renderPanelContent(tab: RightPanelTabId): JSX.Element {
    switch (tab) {
      case "generate":
        return generatePanel
      case "edit":
        return <EditPanel />
      case "layers":
        return <LayersPanel />
      case "stream":
        return (
          <div className="h-full min-h-0">
            <StreamManager />
          </div>
        )
      default:
        return generatePanel
    }
  }

  const panelContent = renderPanelContent(resolvedTab)

  return (
    <>
      <aside className="hidden lg:block w-80 xl:w-96 2xl:w-[28rem] bg-card border-l border-border overflow-y-auto">{panelContent}</aside>

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
