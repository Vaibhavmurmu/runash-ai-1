"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ModelDialogCard } from "@/components/dashboard/model-dialog-card"
import { useModelDialog } from "@/lib/hooks/use-model-dialog"
import type { ModelDialogContract, ModelDialogRunHistoryItem, ModelDialogSseEvent, ModelExecutionState } from "@/lib/types/model-dialog"

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
  const [executionState, setExecutionState] = useState<ModelExecutionState>("idle")
  const [streamingMessage, setStreamingMessage] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [responseOutput, setResponseOutput] = useState("")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [recentRuns, setRecentRuns] = useState<ModelDialogRunHistoryItem[]>([])
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
    setErrorMessage(null)
    setResponseOutput("")
    setElapsedMs(0)
    setRequestId(null)
    startedAtRef.current = 0
  }, [stopExecutionTracking])

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
        setErrorMessage(payload.message || "Model execution failed.")
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
    setErrorMessage(null)
    setResponseOutput("")
    setElapsedMs(0)

    tickTimerRef.current = setInterval(() => {
      if (startedAtRef.current > 0) {
        setElapsedMs(Date.now() - startedAtRef.current)
      }
    }, 250)

    const params = new URLSearchParams({
      modelId: activeModelDialog.model.modelId,
      input:
        activeModelDialog.payload?.prompt ||
        "Tune generation controls, review context, and execute with the selected model policy.",
      requestId: nextRequestId,
      mode,
      qualityPreset,
      temperature: temperature.toString(),
      sourceModule: activeModelDialog.triggerSource,
    })

    const eventSource = new EventSource(`/api/dashboard/model-dialog/stream?${params.toString()}`)
    eventSourceRef.current = eventSource

    eventSource.addEventListener("queued", handleExecutionEvent as EventListener)
    eventSource.addEventListener("running", handleExecutionEvent as EventListener)
    eventSource.addEventListener("partial", handleExecutionEvent as EventListener)
    eventSource.addEventListener("completed", handleExecutionEvent as EventListener)
    eventSource.addEventListener("failed", handleExecutionEvent as EventListener)

    eventSource.onerror = () => {
      setExecutionState("failed")
      setErrorMessage("Streaming connection dropped before completion.")
      stopExecutionTracking()
    }
  }, [activeModelDialog, handleExecutionEvent, mode, qualityPreset, stopExecutionTracking, temperature])

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
        model={{
          ...BASE_MODEL,
          name: activeModelDialog?.model.displayName ?? BASE_MODEL.name,
          provider: activeModelDialog?.model.provider ?? BASE_MODEL.provider,
        }}
        triggerSource={activeModelDialog?.triggerSource}
        dialogMode={activeModelDialog?.mode}
        promptPreview={promptPreview}
        contextPreview={activeModelDialog?.payload?.context}
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
