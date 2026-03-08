"use client"

import ModelSelector from "@/components/editor/model-selector"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getVideoModelMetadata } from "@/lib/editor/video-models/registry"
import type { VideoGenerationRequest } from "@/lib/editor/video-models/types"
import { useEditorPanelContext } from "./editor-panel-context"
import { GenerationHistoryWidget } from "./generation-history-widget"

export interface GeneratePanelProps {
  selectedModel: string
  onModelChange: (model: string) => void
  generationConfig: VideoGenerationRequest
  validationErrors: Record<string, string>
  onGenerationConfigChange: (config: VideoGenerationRequest) => void
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

export default function GeneratePanel({
  selectedModel,
  onModelChange,
  generationConfig,
  validationErrors,
  onGenerationConfigChange,
}: GeneratePanelProps) {
  const {
    activeTimeline,
    playheadSeconds,
    generationHistory,
    generationActionState,
    onCancelRenderJob,
    onRetryRenderJob,
  } = useEditorPanelContext()
  const model = getVideoModelMetadata(selectedModel)

  return (
    <div className="space-y-5 p-4">
      <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <h3 className="text-sm font-semibold">Generation config</h3>
          <p className="mt-1 text-xs text-muted-foreground">{model.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Timeline: {activeTimeline?.name ?? "No active timeline"} · Playhead: {playheadSeconds.toFixed(1)}s
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="gen-prompt" className="text-xs font-medium text-muted-foreground">
            Prompt
          </label>
          <Textarea
            id="gen-prompt"
            value={String(generationConfig.prompt ?? "")}
            onChange={(event) => onGenerationConfigChange({ ...generationConfig, prompt: event.target.value })}
            placeholder="Describe the video you want to generate"
          />
          <FieldError message={validationErrors.prompt} />
        </div>

        <div className="space-y-2">
          <label htmlFor="gen-negative-prompt" className="text-xs font-medium text-muted-foreground">
            Negative prompt
          </label>
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
            <label htmlFor="gen-aspect" className="text-xs font-medium text-muted-foreground">
              Aspect ratio
            </label>
            <select
              id="gen-aspect"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
            <label htmlFor="gen-resolution" className="text-xs font-medium text-muted-foreground">
              Resolution
            </label>
            <select
              id="gen-resolution"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
            <label htmlFor="gen-fps" className="text-xs font-medium text-muted-foreground">
              FPS
            </label>
            <Input
              id="gen-fps"
              type="number"
              min={model.fpsRange.min}
              max={model.fpsRange.max}
              value={String(generationConfig.fps ?? "")}
              onChange={(event) =>
                onGenerationConfigChange({ ...generationConfig, fps: parseOptionalInteger(event.target.value) })
              }
            />
            <FieldError message={validationErrors.fps} />
          </div>

          <div className="space-y-2">
            <label htmlFor="gen-duration-preset" className="text-xs font-medium text-muted-foreground">
              Duration
            </label>
            <select
              id="gen-duration-preset"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
            <label htmlFor="gen-seed" className="text-xs font-medium text-muted-foreground">
              Seed
            </label>
            <Input
              id="gen-seed"
              type="number"
              min={0}
              step={1}
              value={String(generationConfig.seed ?? "")}
              onChange={(event) =>
                onGenerationConfigChange({ ...generationConfig, seed: parseOptionalInteger(event.target.value) })
              }
            />
            <FieldError message={validationErrors.seed} />
          </div>

          <div className="space-y-2">
            <label htmlFor="gen-quality-mode" className="text-xs font-medium text-muted-foreground">
              Quality mode
            </label>
            <select
              id="gen-quality-mode"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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

      <GenerationHistoryWidget
        jobs={generationHistory}
        actionState={generationActionState}
        onCancel={onCancelRenderJob}
        onRetry={onRetryRenderJob}
      />
    </div>
  )
}
