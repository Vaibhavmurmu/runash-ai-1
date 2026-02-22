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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import type { ModelExecutionState } from "@/lib/types/model-dialog"
import { CheckCircle2, Clock3, Loader2, RotateCcw, Sparkles, Wand2, XCircle } from "lucide-react"

type ModelOption = {
  label: string
  value: string
}

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
  promptPreview: string
  contextPreview?: string
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
  errorMessage?: string | null
  onRun: () => void
  onSavePreset: () => void
  onRetry?: () => void
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

export function ModelDialogCard({
  open,
  onOpenChange,
  model,
  promptPreview,
  contextPreview,
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
  errorMessage,
  onRun,
  onSavePreset,
  onRetry,
}: ModelDialogCardProps) {
  const isBusy = executionState === "queued" || executionState === "running" || executionState === "partial-output"
  const statusLabel = model.status.charAt(0).toUpperCase() + model.status.slice(1)
  const initials = model.name
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

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
              <Badge variant="secondary" className={STATUS_STYLES[model.status]}>
                {statusLabel}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 py-5">
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prompt preview</h3>
              <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
                {promptPreview}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Context preview</h3>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                {contextPreview || "No additional context provided."}
              </div>
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
                  <p className="text-sm font-medium text-destructive">{errorMessage || "Model execution failed."}</p>
                  <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={!onRetry}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
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
