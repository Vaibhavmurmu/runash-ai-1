"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import type {
  ModelDialogErrorCode,
  ModelDialogGenerationMode,
  ModelDialogModeContext,
  ModelDialogRunHistoryItem,
  ModelExecutionState,
} from "@/lib/types/model-dialog"
import { CheckCircle2, Clock3, Loader2, RotateCcw, Sparkles, Wand2, XCircle } from "lucide-react"

type ModelOption = {
  label: string
  value: string
}

type ExecutionMode = ModelDialogGenerationMode

type ModeWithContext =
  | "live-view"
  | "previous-live-view"
  | "video-on-demand"
  | "live-streaming"
  | "stream"
  | "scheduling"

type ModelIdentity = {
  name: string
  provider: string
  avatarUrl?: string
  status: "ready" | "offline" | "beta" | "degraded"
}

interface ModelDialogCardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: ModelIdentity
  triggerSource?: string
  dialogMode?: string
  executionMode: ExecutionMode
  onExecutionModeChange: (value: ExecutionMode) => void
  promptPreview: string
  contextPreview?: string
  sourceModule: string
  onSourceModuleChange: (value: string) => void
  streamId: string
  onStreamIdChange: (value: string) => void
  recordingId: string
  onRecordingIdChange: (value: string) => void
  assetId: string
  onAssetIdChange: (value: string) => void
  modeContextByMode: Record<ModeWithContext, ModelDialogModeContext>
  onModeContextChange: (mode: ModeWithContext, field: keyof ModelDialogModeContext, value: string) => void
  temperature: number
  onTemperatureChange: (value: number) => void
  mode: string
  onModeChange: (value: string) => void
  modeOptions: ModelOption[]
  qualityPreset: string
  onQualityPresetChange: (value: string) => void
  qualityOptions: ModelOption[]
  executionState?: ModelExecutionState
  streamingMessage?: string
  responseOutput?: string
  elapsedMs?: number
  requestId?: string | null
  errorCode?: ModelDialogErrorCode | null
  errorMessage?: string | null
  onRun: () => void
  onSavePreset: () => void
  onRetry?: () => void
  recentRuns?: ModelDialogRunHistoryItem[]
}

const STATUS_STYLES: Record<ModelIdentity["status"], string> = {
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  offline: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  beta: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  degraded: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
}

const EXECUTION_STATE_LABELS: Record<ModelExecutionState, string> = {
  idle: "Idle",
  queued: "Queued",
  running: "Running",
  "partial-output": "Partial output",
  completed: "Completed",
  failed: "Failed",
}

const EXECUTION_MODE_OPTIONS: Array<{ label: string; value: ExecutionMode }> = [
  { label: "Generic", value: "generic" },
  { label: "Image generation", value: "image-generation" },
  { label: "Video generation", value: "video-generation" },
  { label: "Live stream assist", value: "live-stream-assist" },
  { label: "Previous live optimization", value: "previous-live-optimization" },
  { label: "Live view", value: "live-view" },
  { label: "Previous live view", value: "previous-live-view" },
  { label: "Video on demand", value: "video-on-demand" },
  { label: "Live streaming", value: "live-streaming" },
  { label: "Stream", value: "stream" },
  { label: "Scheduling", value: "scheduling" },
]

const MODE_CARD_CONFIG: Record<
  ModeWithContext,
  {
    title: string
    description: string
    requiredFields: Array<keyof ModelDialogModeContext>
    optionalFields: Array<keyof ModelDialogModeContext>
  }
> = {
  "live-view": {
    title: "Live View Context",
    description: "Use a live dataset snapshot and source library to keep the model aligned with current live view activity.",
    requiredFields: ["datasetId", "librarySource"],
    optionalFields: ["filters", "snapshotTime"],
  },
  "previous-live-view": {
    title: "Previous Live View Context",
    description: "Reference previous live view datasets for replay-style analysis and optimization.",
    requiredFields: ["datasetId", "snapshotTime"],
    optionalFields: ["librarySource", "filters"],
  },
  "video-on-demand": {
    title: "Video-on-Demand Context",
    description: "Provide VOD dataset references and source library metadata for retrospective processing.",
    requiredFields: ["datasetId", "librarySource"],
    optionalFields: ["filters", "snapshotTime"],
  },
  "live-streaming": {
    title: "Live Streaming Context",
    description: "Attach stream dataset filters and temporal hints for real-time handling.",
    requiredFields: ["datasetId", "filters"],
    optionalFields: ["librarySource", "snapshotTime"],
  },
  stream: {
    title: "Stream Context",
    description: "Define stream-focused library lookups and snapshots for context-aware responses.",
    requiredFields: ["datasetId"],
    optionalFields: ["librarySource", "filters", "snapshotTime"],
  },
  scheduling: {
    title: "Scheduling Context",
    description: "Capture scheduling datasets and time snapshots for queue/run-planning logic.",
    requiredFields: ["datasetId", "snapshotTime"],
    optionalFields: ["librarySource", "filters"],
  },
}

function shouldShowField(field: "streamId" | "recordingId" | "assetId", mode: ExecutionMode) {
  if (mode === "generic") {
    return false
  }

  if (field === "assetId") {
    return mode === "image-generation" || mode === "video-generation"
  }

  if (field === "streamId") {
    return mode === "live-stream-assist" || mode === "previous-live-optimization" || mode === "live-streaming" || mode === "stream"
  }

  return mode === "video-generation" || mode === "previous-live-optimization" || mode === "video-on-demand"
}

function formatFieldLabel(field: keyof ModelDialogModeContext) {
  if (field === "datasetId") return "Dataset ID"
  if (field === "librarySource") return "Library source"
  if (field === "filters") return "Filters"
  return "Snapshot time"
}

function formatFieldHint(field: keyof ModelDialogModeContext) {
  if (field === "datasetId") return "Stable dataset identifier, e.g. ds_live_001"
  if (field === "librarySource") return "Reference origin, e.g. internal-index, s3://bucket/path"
  if (field === "filters") return "Structured filtering expression, e.g. region=us,status=active"
  return "ISO timestamp preferred, e.g. 2026-02-24T18:30:00Z"
}


type ErrorCardConfig = {
  title: string
  description: string
  ctaLabel: string
  ctaHint: string
}

const ERROR_CARD_CONFIG: Partial<Record<ModelDialogErrorCode, ErrorCardConfig>> = {
  USAGE_LIMIT_REACHED: {
    title: "Usage exhausted",
    description: "You have reached the usage allowance for your current plan.",
    ctaLabel: "Switch model",
    ctaHint: "Try a lighter model or reduce quality preset to continue immediately.",
  },
  PLAN_UPGRADE_REQUIRED: {
    title: "Plan upgrade required",
    description: "This model capability is not available on your current plan tier.",
    ctaLabel: "Upgrade plan",
    ctaHint: "Upgrade to unlock this model capability for future runs.",
  },
  MODEL_DIALOG_PROVIDER_DOWN: {
    title: "Provider down",
    description: "The provider is currently unavailable or degraded.",
    ctaLabel: "Retry",
    ctaHint: "Retry now or switch to an alternate model while provider health recovers.",
  },
  MODEL_DIALOG_INVALID_PROMPT_INPUT: {
    title: "Invalid prompt/input",
    description: "The prompt could not be processed in its current shape.",
    ctaLabel: "Reduce context",
    ctaHint: "Trim prompt size, remove unsupported tokens, then run again.",
  },
  MODEL_DIALOG_INVALID_REQUEST: {
    title: "Invalid prompt/input",
    description: "The request payload could not be validated.",
    ctaLabel: "Reduce context",
    ctaHint: "Check required fields and shorten payload context before retrying.",
  },
  RATE_LIMITED: {
    title: "Rate limited",
    description: "Too many requests were submitted recently. Please try again shortly.",
    ctaLabel: "Retry",
    ctaHint: "Wait a few seconds and retry to avoid burst throttling.",
  },
}

export function ModelDialogCard({
  open,
  onOpenChange,
  model,
  triggerSource,
  dialogMode,
  executionMode,
  onExecutionModeChange,
  promptPreview,
  contextPreview,
  sourceModule,
  onSourceModuleChange,
  streamId,
  onStreamIdChange,
  recordingId,
  onRecordingIdChange,
  assetId,
  onAssetIdChange,
  modeContextByMode,
  onModeContextChange,
  temperature,
  onTemperatureChange,
  mode,
  onModeChange,
  modeOptions,
  qualityPreset,
  onQualityPresetChange,
  qualityOptions,
  executionState = "idle",
  streamingMessage,
  responseOutput,
  elapsedMs = 0,
  requestId,
  errorCode,
  errorMessage,
  onRun,
  onSavePreset,
  onRetry,
  recentRuns = [],
}: ModelDialogCardProps) {
  const isBusy = executionState === "queued" || executionState === "running" || executionState === "partial-output"
  const statusLabel = model.status.charAt(0).toUpperCase() + model.status.slice(1)
  const initials = model.name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const contextMode = executionMode in MODE_CARD_CONFIG ? (executionMode as ModeWithContext) : null
  const errorConfig = errorCode ? ERROR_CARD_CONFIG[errorCode] : null
  const latestRun = recentRuns[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/50 bg-background/95 p-0 shadow-2xl backdrop-blur">
        <DialogHeader className="sr-only">
          <DialogTitle>{model.name} configuration</DialogTitle>
          <DialogDescription>Review prompt context, tune model controls, and run generation.</DialogDescription>
        </DialogHeader>

        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="space-y-4 border-b border-border/50 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/70">
                  <AvatarImage src={model.avatarUrl} alt={model.name} />
                  <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base font-semibold">{model.name}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{model.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {triggerSource ? (
                  <Badge variant="outline" className="capitalize">
                    Source: {triggerSource}
                  </Badge>
                ) : null}
                {dialogMode ? (
                  <Badge variant="outline" className="capitalize">
                    Mode: {dialogMode}
                  </Badge>
                ) : null}
                <Badge variant="secondary" className={STATUS_STYLES[model.status]}>
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 py-5">
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Generation mode</h3>
              <div className="flex flex-wrap gap-2">
                {EXECUTION_MODE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={executionMode === option.value ? "default" : "outline"}
                    onClick={() => onExecutionModeChange(option.value)}
                    className="h-8"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prompt preview</h3>
              <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {promptPreview}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Context preview</h3>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                {contextPreview || "No explicit context payload provided."}
              </div>
            </section>

            {contextMode ? (
              <section className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">{MODE_CARD_CONFIG[contextMode].title}</h3>
                  <p className="text-xs text-muted-foreground">{MODE_CARD_CONFIG[contextMode].description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["datasetId", "librarySource", "filters", "snapshotTime"] as const).map((field) => {
                    const required = MODE_CARD_CONFIG[contextMode].requiredFields.includes(field)
                    return (
                      <div key={field} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${contextMode}-${field}`}>{formatFieldLabel(field)}</Label>
                          <Badge variant={required ? "default" : "outline"}>{required ? "Required" : "Optional"}</Badge>
                        </div>
                        <Input
                          id={`${contextMode}-${field}`}
                          value={modeContextByMode[contextMode][field] ?? ""}
                          onChange={(event) => onModeContextChange(contextMode, field, event.target.value)}
                          placeholder={formatFieldHint(field)}
                        />
                        <p className="text-xs text-muted-foreground">{formatFieldHint(field)}</p>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="source-module">Source module</Label>
                <Input id="source-module" value={sourceModule} onChange={(event) => onSourceModuleChange(event.target.value)} />
              </div>
              {shouldShowField("streamId", executionMode) ? (
                <div className="space-y-2">
                  <Label htmlFor="stream-id">Stream ID</Label>
                  <Input id="stream-id" value={streamId} onChange={(event) => onStreamIdChange(event.target.value)} placeholder="stream_123" />
                </div>
              ) : null}
              {shouldShowField("recordingId", executionMode) ? (
                <div className="space-y-2">
                  <Label htmlFor="recording-id">Recording ID</Label>
                  <Input id="recording-id" value={recordingId} onChange={(event) => onRecordingIdChange(event.target.value)} placeholder="rec_123" />
                </div>
              ) : null}
              {shouldShowField("assetId", executionMode) ? (
                <div className="space-y-2">
                  <Label htmlFor="asset-id">Asset ID</Label>
                  <Input id="asset-id" value={assetId} onChange={(event) => onAssetIdChange(event.target.value)} placeholder="asset_123" />
                </div>
              ) : null}
            </section>

            <section className="grid gap-4 rounded-lg border border-border/60 bg-card/50 p-4 sm:grid-cols-2">
              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="model-temperature">Temperature</Label>
                  <span className="text-xs text-muted-foreground">{temperature.toFixed(2)}</span>
                </div>
                <Slider
                  id="model-temperature"
                  min={0}
                  max={2}
                  step={0.05}
                  value={[temperature]}
                  onValueChange={(values) => onTemperatureChange(values[0] ?? temperature)}
                />
              </div>

              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={onModeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {modeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quality preset</Label>
                <Select value={qualityPreset} onValueChange={onQualityPresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="rounded-lg border border-border/60 bg-muted/30 p-4">
              {executionState === "failed" || errorMessage ? (
                <div className="space-y-3">
                  {errorConfig ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-sm font-semibold text-destructive">{errorConfig.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{errorConfig.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{errorConfig.ctaHint}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{errorMessage || "Model execution failed."}</p>
                      <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={!onRetry} className="mt-3">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {errorConfig.ctaLabel}
                      </Button>
                    </div>
                  ) : null}
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive">{errorMessage || "Model execution failed."}</p>
                    {requestId ? <p className="mt-1 text-xs text-muted-foreground">Request ID: {requestId}</p> : null}
                    <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={!onRetry} className="mt-3">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : isBusy ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" />
                    <div className="space-y-1">
                      <p className="font-medium">{EXECUTION_STATE_LABELS[executionState]}</p>
                      <p className="text-muted-foreground">{streamingMessage || "Please keep this dialog open."}</p>
                    </div>
                  </div>
                  {responseOutput ? <p className="rounded-md bg-background/70 p-2 text-foreground">{responseOutput}</p> : null}
                </div>
              ) : executionState === "completed" ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 font-medium text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    Completed
                  </div>
                  <p className="rounded-md bg-background/70 p-2 text-foreground">{responseOutput || "No output returned."}</p>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Wand2 className="mt-0.5 h-4 w-4" />
                  <p>Ready to run with the selected controls and current context.</p>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent-run diagnostics</h3>
              <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Request ID:</span> {requestId || "n/a"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Provider:</span> {model.provider}
                </p>
                <p>
                  <span className="font-medium text-foreground">Current model:</span> {model.name}
                </p>
                <p>
                  <span className="font-medium text-foreground">Latest run:</span>{" "}
                  {latestRun ? `${latestRun.modelId} (${latestRun.status})` : "No recent runs"}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick history</h3>
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                {recentRuns.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent model runs yet.</p>
                ) : (
                  recentRuns.map((run) => (
                    <div key={run.id} className="rounded-md border border-border/50 bg-background/70 p-2 text-xs">
                      <p className="font-medium text-foreground">
                        {run.modelId} • {run.status}
                      </p>
                      <p className="line-clamp-2 text-muted-foreground">{run.inputSummary}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </CardContent>

          <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border/50 px-6 py-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
              <span className="truncate">Request ID: {requestId || "n/a"}</span>
              {executionState === "failed" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={onSavePreset} disabled={isBusy}>
                <Sparkles className="mr-2 h-4 w-4" />
                Save preset
              </Button>
              <Button type="button" onClick={onRun} disabled={isBusy || model.status === "offline"}>
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run
              </Button>
            </div>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
