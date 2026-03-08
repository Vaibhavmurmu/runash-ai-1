"use client"

import { useMemo, useState } from "react"
import { ModelDialogCard } from "@/components/dashboard/model-dialog-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModelDialogGenerationMode, ModelDialogModeContext, ModelExecutionState } from "@/lib/types/model-dialog"

type ContextualMode = "live-view" | "previous-live-view" | "video-on-demand" | "live-streaming" | "stream" | "scheduling"
type ModelDialogContextRecord = Record<ContextualMode, ModelDialogModeContext>

const EMPTY_MODE_CONTEXT: ModelDialogModeContext = {
  datasetId: "",
  librarySource: "",
  filters: "",
  snapshotTime: "",
}

const EMPTY_MODE_CONTEXTS: ModelDialogContextRecord = {
  "live-view": { ...EMPTY_MODE_CONTEXT },
  "previous-live-view": { ...EMPTY_MODE_CONTEXT },
  "video-on-demand": { ...EMPTY_MODE_CONTEXT },
  "live-streaming": { ...EMPTY_MODE_CONTEXT },
  stream: { ...EMPTY_MODE_CONTEXT },
  scheduling: { ...EMPTY_MODE_CONTEXT },
}

interface CheckoutModelDialogSectionProps {
  selectedPlan?: string
  selectedModelId?: string
  selectedModelLabel?: string
  isSubmitting: boolean
  submitError?: string | null
  onCheckoutSubmitFromReview: () => void
}

export function CheckoutModelDialogSection({
  selectedPlan,
  selectedModelId,
  selectedModelLabel,
  isSubmitting,
  submitError,
  onCheckoutSubmitFromReview,
}: CheckoutModelDialogSectionProps) {
  const [open, setOpen] = useState(false)
  const [modelId, setModelId] = useState(selectedModelId ?? "gpt-4o-mini")
  const [mode, setMode] = useState("balanced")
  const [qualityPreset, setQualityPreset] = useState("high")
  const [temperature, setTemperature] = useState(0.7)
  const [executionMode, setExecutionMode] = useState<ModelDialogGenerationMode>("generic")
  const [sourceModule, setSourceModule] = useState("checkout")
  const [streamId, setStreamId] = useState("")
  const [recordingId, setRecordingId] = useState("")
  const [assetId, setAssetId] = useState("")
  const [modeContexts, setModeContexts] = useState<ModelDialogContextRecord>(EMPTY_MODE_CONTEXTS)

  const executionState: ModelExecutionState = isSubmitting ? "running" : "idle"

  const modelSummary = useMemo(() => {
    if (!selectedModelId && !selectedModelLabel) return "No model selected (optional)"
    return [selectedModelLabel, selectedModelId].filter(Boolean).join(" · ")
  }, [selectedModelId, selectedModelLabel])

  return (
    <Card data-testid="checkout-model-dialog-section">
      <CardHeader>
        <CardTitle>AI Model Review</CardTitle>
        <CardDescription>Optional model metadata is carried with checkout and never blocks payment submission.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm text-muted-foreground" data-testid="checkout-model-summary">
          <p>Plan: {selectedPlan ?? "Not specified"}</p>
          <p>Model: {modelSummary}</p>
        </div>

        {submitError ? <p className="text-sm text-red-600">Checkout validation: {submitError}</p> : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Configure Model
          </Button>
          <Button type="button" onClick={onCheckoutSubmitFromReview} disabled={isSubmitting}>
            {isSubmitting ? "Submitting checkout..." : "Continue with checkout"}
          </Button>
        </div>

        <ModelDialogCard
          open={open}
          onOpenChange={setOpen}
          model={{ name: selectedModelLabel ?? "Checkout model", provider: "RunAsh AI", status: "ready" }}
          modelOptions={[
            { id: "gpt-4o-mini", provider: "OpenAI", label: "GPT-4o mini" },
            { id: "gpt-4.1-mini", provider: "OpenAI", label: "GPT-4.1 mini" },
            { id: "claude-3.5-sonnet", provider: "Anthropic", label: "Claude 3.5 Sonnet" },
          ]}
          selectedModelId={modelId}
          onSelectedModelIdChange={setModelId}
          triggerSource="checkout"
          dialogMode="configure"
          executionMode={executionMode}
          onExecutionModeChange={setExecutionMode}
          promptPreview={`Review checkout context for ${selectedPlan ?? "selected plan"}`}
          contextPreview={`Plan: ${selectedPlan ?? "n/a"} · Model: ${modelSummary}`}
          sourceModule={sourceModule}
          onSourceModuleChange={setSourceModule}
          streamId={streamId}
          onStreamIdChange={setStreamId}
          recordingId={recordingId}
          onRecordingIdChange={setRecordingId}
          assetId={assetId}
          onAssetIdChange={setAssetId}
          modeContextByMode={modeContexts}
          onModeContextChange={(contextMode, field, value) => {
            setModeContexts((previous) => ({
              ...previous,
              [contextMode]: {
                ...previous[contextMode],
                [field]: value,
              },
            }))
          }}
          temperature={temperature}
          onTemperatureChange={setTemperature}
          mode={mode}
          onModeChange={setMode}
          modeOptions={[
            { label: "Balanced", value: "balanced" },
            { label: "Creative", value: "creative" },
            { label: "Precise", value: "precise" },
          ]}
          qualityPreset={qualityPreset}
          onQualityPresetChange={setQualityPreset}
          qualityOptions={[
            { label: "High", value: "high" },
            { label: "Standard", value: "standard" },
          ]}
          executionState={executionState}
          streamingMessage={isSubmitting ? "Checkout is processing while model metadata remains optional." : undefined}
          errorMessage={submitError ?? null}
          onRun={onCheckoutSubmitFromReview}
          onSavePreset={() => setOpen(false)}
          onRetry={onCheckoutSubmitFromReview}
          recentRuns={[]}
        />
      </CardContent>
    </Card>
  )
}
