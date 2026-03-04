"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ModelDialogCard } from "@/components/dashboard/model-dialog-card"
import { useModelDialog } from "@/lib/hooks/use-model-dialog"
import { listModelCatalog } from "@/lib/ai/provider-registry"
import type {
  ModelDialogContract,
  ModelDialogErrorCode,
  ModelDialogGenerationMode,
  ModelDialogModeContext,
  ModelDialogRunHistoryItem,
  ModelDialogSseEvent,
  ModelExecutionState,
} from "@/lib/types/model-dialog"

type DialogExecutionMode = ModelDialogGenerationMode

type ContextualExecutionMode =
  | "live-view"
  | "previous-live-view"
  | "video-on-demand"
  | "live-streaming"
  | "stream"
  | "scheduling"

const EMPTY_MODE_CONTEXT: ModelDialogModeContext = {
  datasetId: "",
  librarySource: "",
  filters: "",
  snapshotTime: "",
}

const EMPTY_MODE_CONTEXTS: Record<ContextualExecutionMode, ModelDialogModeContext> = {
  "live-view": { ...EMPTY_MODE_CONTEXT },
  "previous-live-view": { ...EMPTY_MODE_CONTEXT },
  "video-on-demand": { ...EMPTY_MODE_CONTEXT },
  "live-streaming": { ...EMPTY_MODE_CONTEXT },
  stream: { ...EMPTY_MODE_CONTEXT },
  scheduling: { ...EMPTY_MODE_CONTEXT },
}

function resolveExecutionMode(payload?: ModelDialogContract["payload"]): DialogExecutionMode {
  if (!payload?.generationMode) {
    return "generic"
  }

  return payload.generationMode
}

function resolveModeContexts(payload?: ModelDialogContract["payload"]): Record<ContextualExecutionMode, ModelDialogModeContext> {
  return {
    "live-view": { ...EMPTY_MODE_CONTEXT, ...(payload?.liveViewContext ?? {}) },
    "previous-live-view": { ...EMPTY_MODE_CONTEXT, ...(payload?.previousLiveViewContext ?? {}) },
    "video-on-demand": { ...EMPTY_MODE_CONTEXT, ...(payload?.videoOnDemandContext ?? {}) },
    "live-streaming": { ...EMPTY_MODE_CONTEXT, ...(payload?.liveStreamingContext ?? {}) },
    stream: { ...EMPTY_MODE_CONTEXT, ...(payload?.streamContext ?? {}) },
    scheduling: { ...EMPTY_MODE_CONTEXT, ...(payload?.schedulingContext ?? {}) },
  }
}

function appendContextParams(prefix: string, context: ModelDialogModeContext, params: URLSearchParams) {
  params.set(`${prefix}DatasetId`, context.datasetId?.trim() ?? "")
  params.set(`${prefix}LibrarySource`, context.librarySource?.trim() ?? "")
  params.set(`${prefix}Filters`, context.filters?.trim() ?? "")
  params.set(`${prefix}SnapshotTime`, context.snapshotTime?.trim() ?? "")
}

interface DashboardModelDialogContextValue {
  openFromTrigger: (payload: ModelDialogContract, trigger?: HTMLElement | null) => void
  close: () => void
}

const DashboardModelDialogContext = createContext<DashboardModelDialogContextValue | null>(null)

const BASE_MODEL = {
  name: "RunAsh Model Router",
  provider: "RunAsh AI",
  status: "ready" as const,
}



type ModelDialogResponseEnvelope = {
  requestId?: string
  status?: "completed" | "accepted" | "failed"
  output?: unknown
  error?: {
    code?: ModelDialogErrorCode
    message?: string
  } | null
}

function parseModelDialogError(payload: ModelDialogSseEvent | ModelDialogResponseEnvelope) {
  const code = ("errorCode" in payload ? payload.errorCode : payload.error?.code) ?? null
  const message = ("errorMessage" in payload ? payload.errorMessage : payload.error?.message) ?? null

  return { code, message }
}

function createExecutionRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.random() * 16 | 0
    const value = token === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function DashboardModelDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { activeModelDialog, isOpen, openModelDialog, closeModelDialog } = useModelDialog()
  const [temperature, setTemperature] = useState(0.7)
  const [mode, setMode] = useState("balanced")
  const [qualityPreset, setQualityPreset] = useState("high")
  const [executionMode, setExecutionMode] = useState<DialogExecutionMode>("generic")
  const [sourceModule, setSourceModule] = useState<ModelDialogContract["triggerSource"] | "dashboard">("dashboard")
  const [streamId, setStreamId] = useState("")
  const [recordingId, setRecordingId] = useState("")
  const [assetId, setAssetId] = useState("")
  const [modeContexts, setModeContexts] = useState<Record<ContextualExecutionMode, ModelDialogModeContext>>(EMPTY_MODE_CONTEXTS)
  const [executionState, setExecutionState] = useState<ModelExecutionState>("idle")
  const [streamingMessage, setStreamingMessage] = useState<string>("")
  const [errorCode, setErrorCode] = useState<ModelDialogErrorCode | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [responseOutput, setResponseOutput] = useState("")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [recentRuns, setRecentRuns] = useState<ModelDialogRunHistoryItem[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("gpt-4o-mini")




  const modelCatalog = useMemo(() => listModelCatalog(), [])
  const selectedCatalogEntry = useMemo(
    () => modelCatalog.find((entry) => entry.id === selectedModelId) ?? null,
    [modelCatalog, selectedModelId],
  )




  const eventSourceRef = useRef<EventSource | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  const stopExecutionTracking = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }, [])

  const resetExecutionState = useCallback(() => {
    stopExecutionTracking()
    setExecutionState("idle")
    setStreamingMessage("")
    setErrorCode(null)
    setErrorMessage(null)
    setResponseOutput("")
    setElapsedMs(0)
    setRequestId(null)
    startedAtRef.current = 0
  }, [stopExecutionTracking])

  useEffect(() => {
    if (!activeModelDialog) {
      setExecutionMode("generic")
      setSourceModule("dashboard")
      setStreamId("")
      setRecordingId("")
      setAssetId("")
      setModeContexts(EMPTY_MODE_CONTEXTS)
      return
    }

    setSelectedModelId(activeModelDialog.model.modelId)

    const payload = activeModelDialog.payload
    setExecutionMode(resolveExecutionMode(payload))
    setSourceModule(payload?.sourceModule ?? activeModelDialog.triggerSource)
    setStreamId(payload?.streamId ?? "")
    setRecordingId(payload?.recordingId ?? "")
    setAssetId(payload?.assetId ?? payload?.mediaAssetId ?? "")
    setModeContexts(resolveModeContexts(payload))
  }, [activeModelDialog])

  const updateModeContext = useCallback(
    (modeKey: ContextualExecutionMode, field: keyof ModelDialogModeContext, value: string) => {
      setModeContexts((previous) => ({
        ...previous,
        [modeKey]: {
          ...previous[modeKey],
          [field]: value,
        },
      }))
    },
    [],
  )

  const openFromTrigger = useCallback(
    (payload: ModelDialogContract, trigger?: HTMLElement | null) => {
      resetExecutionState()
      openModelDialog(payload, trigger)
    },
    [openModelDialog, resetExecutionState],
  )

  useEffect(() => {
    closeModelDialog()
    resetExecutionState()
  }, [pathname, closeModelDialog, resetExecutionState])

  useEffect(() => {
    return () => {
      stopExecutionTracking()
    }
  }, [stopExecutionTracking])

  const loadRecentRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/model-dialog/recent?limit=5", { cache: "no-store" })
      if (!response.ok) return
      const payload = (await response.json()) as { runs?: ModelDialogRunHistoryItem[] }
      setRecentRuns(Array.isArray(payload.runs) ? payload.runs : [])
    } catch {
      setRecentRuns([])
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadRecentRuns()
    }
  }, [isOpen, loadRecentRuns])

  const handleExecutionEvent = useCallback(
    (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as ModelDialogSseEvent
      setExecutionState(payload.state)
      setStreamingMessage(payload.message)
      setElapsedMs(payload.elapsedMs)
      if (payload.requestId) {
        setRequestId(payload.requestId)
      }

      if (payload.chunk) {
        setResponseOutput((previous) => (previous ? `${previous}\n${payload.chunk}` : payload.chunk))
      }

      if (payload.state === "completed") {
        stopExecutionTracking()
        void loadRecentRuns()
      }

      if (payload.state === "failed") {
        const structuredError = parseModelDialogError(payload)
        setErrorCode(structuredError.code)
        setErrorMessage(structuredError.message || payload.message || "Model execution failed.")
        stopExecutionTracking()
        void loadRecentRuns()
      }
    },
    [loadRecentRuns, stopExecutionTracking],
  )

  const runModel = useCallback(() => {
    if (!activeModelDialog) {
      return
    }

    stopExecutionTracking()
    const nextRequestId = createExecutionRequestId()
    startedAtRef.current = Date.now()
    setRequestId(nextRequestId)
    setExecutionState("queued")
    setStreamingMessage("Request queued for model execution.")
    setErrorCode(null)
    setErrorMessage(null)
    setResponseOutput("")
    setElapsedMs(0)

    tickTimerRef.current = setInterval(() => {
      if (startedAtRef.current > 0) {
        setElapsedMs(Date.now() - startedAtRef.current)
      }
    }, 250)

    const params = new URLSearchParams({
      modelId: selectedModelId || activeModelDialog.model.modelId,
      input:
        activeModelDialog.payload?.prompt ||
        "Tune generation controls, review context, and execute with the selected model policy.",
      requestId: nextRequestId,
      mode,
      qualityPreset,
      temperature: temperature.toString(),
      sourceModule,
    })

    if (streamId) {
      params.set("streamId", streamId)
    }

    if (recordingId) {
      params.set("recordingId", recordingId)
    }

    if (assetId) {
      params.set("assetId", assetId)
    }

    if (executionMode !== "generic") {
      params.set("executionMode", executionMode)
    }

    if (executionMode === "live-view") {
      appendContextParams("liveViewContext", modeContexts["live-view"], params)
    } else if (executionMode === "previous-live-view") {
      appendContextParams("previousLiveViewContext", modeContexts["previous-live-view"], params)
    } else if (executionMode === "video-on-demand") {
      appendContextParams("videoOnDemandContext", modeContexts["video-on-demand"], params)
    } else if (executionMode === "live-streaming") {
      appendContextParams("liveStreamingContext", modeContexts["live-streaming"], params)
    } else if (executionMode === "stream") {
      appendContextParams("streamContext", modeContexts.stream, params)
    } else if (executionMode === "scheduling") {
      appendContextParams("schedulingContext", modeContexts.scheduling, params)
    }

    const eventSource = new EventSource(`/api/dashboard/model-dialog/stream?${params.toString()}`)
    eventSourceRef.current = eventSource

    eventSource.addEventListener("queued", handleExecutionEvent as EventListener)
    eventSource.addEventListener("running", handleExecutionEvent as EventListener)
    eventSource.addEventListener("partial", handleExecutionEvent as EventListener)
    eventSource.addEventListener("completed", handleExecutionEvent as EventListener)
    eventSource.addEventListener("failed", handleExecutionEvent as EventListener)

    eventSource.onerror = () => {
      setExecutionState("failed")
      setErrorCode("MODEL_DIALOG_STREAM_INTERNAL_ERROR")
      setErrorMessage("Streaming connection dropped before completion.")
      stopExecutionTracking()
    }
  }, [activeModelDialog, assetId, executionMode, handleExecutionEvent, mode, modeContexts, qualityPreset, recordingId, selectedModelId, sourceModule, stopExecutionTracking, streamId, temperature])

  const value = useMemo(
    () => ({
      openFromTrigger,
      close: closeModelDialog,
    }),
    [openFromTrigger, closeModelDialog],
  )

  const promptPreview =
    activeModelDialog?.payload?.prompt ??
    "Tune generation controls, review context, and execute with the selected model policy."
  const dialogModelIdentity = {
    ...BASE_MODEL,
    name: selectedCatalogEntry?.label ?? activeModelDialog?.model.displayName ?? BASE_MODEL.name,
    provider: selectedCatalogEntry?.provider ?? activeModelDialog?.model.provider ?? BASE_MODEL.provider,
  }

  return (
    <DashboardModelDialogContext.Provider value={value}>
      {children}
      <ModelDialogCard
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeModelDialog()
            resetExecutionState()
          }
        }}

        model={dialogModelIdentity}
        modelOptions={modelCatalog.map((entry) => ({ id: entry.id, provider: entry.provider, label: entry.label }))}


        model={dialogModelIdentity}
        modelOptions={modelCatalog.map((entry) => ({ id: entry.id, provider: entry.provider, label: entry.label }))}

        model={{
          ...BASE_MODEL,
          name:
            listModelCatalog().find((entry) => entry.id === selectedModelId)?.label ??
            activeModelDialog?.model.displayName ??
            BASE_MODEL.name,
          provider:
            listModelCatalog().find((entry) => entry.id === selectedModelId)?.provider ??
            activeModelDialog?.model.provider ??
            BASE_MODEL.provider,
        }}
        modelOptions={listModelCatalog().map((entry) => ({ id: entry.id, provider: entry.provider, label: entry.label }))}


        selectedModelId={selectedModelId}
        onSelectedModelIdChange={setSelectedModelId}
        triggerSource={activeModelDialog?.triggerSource}
        dialogMode={activeModelDialog?.mode}
        executionMode={executionMode}
        onExecutionModeChange={setExecutionMode}
        promptPreview={promptPreview}
        contextPreview={activeModelDialog?.payload?.context}
        sourceModule={sourceModule}
        onSourceModuleChange={setSourceModule}
        streamId={streamId}
        onStreamIdChange={setStreamId}
        recordingId={recordingId}
        onRecordingIdChange={setRecordingId}
        assetId={assetId}
        onAssetIdChange={setAssetId}
        modeContextByMode={modeContexts}
        onModeContextChange={updateModeContext}
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
          { label: "Fast", value: "fast" },
          { label: "High", value: "high" },
          { label: "Ultra", value: "ultra" },
        ]}
        executionState={executionState}
        streamingMessage={streamingMessage}
        responseOutput={responseOutput}
        elapsedMs={elapsedMs}
        requestId={requestId}
        errorCode={errorCode}
        errorMessage={errorMessage}
        onRun={runModel}
        onSavePreset={closeModelDialog}
        onRetry={runModel}
        recentRuns={recentRuns}
      />
    </DashboardModelDialogContext.Provider>
  )
}

export function useDashboardModelDialog() {
  const context = useContext(DashboardModelDialogContext)

  if (context) {
    return context
  }

  return {
    openFromTrigger: () => {},
    close: () => {},
  }
}
