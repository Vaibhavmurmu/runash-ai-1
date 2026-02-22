"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { ModelDialogCard } from "@/components/dashboard/model-dialog-card"
import { useModelDialog } from "@/lib/hooks/use-model-dialog"
import type { ModelDialogContract } from "@/lib/types/model-dialog"

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

export function DashboardModelDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { activeModelDialog, isOpen, openModelDialog, closeModelDialog } = useModelDialog()
  const [temperature, setTemperature] = useState(0.7)
  const [mode, setMode] = useState("balanced")
  const [qualityPreset, setQualityPreset] = useState("high")

  const openFromTrigger = useCallback(
    (payload: ModelDialogContract, trigger?: HTMLElement | null) => {
      openModelDialog(payload, trigger)
    },
    [openModelDialog],
  )

  useEffect(() => {
    closeModelDialog()
  }, [pathname, closeModelDialog])

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
          }
        }}
        model={{
          ...BASE_MODEL,
          name: activeModelDialog?.model.displayName ?? BASE_MODEL.name,
          provider: activeModelDialog?.model.provider ?? BASE_MODEL.provider,
        }}
        promptPreview={promptPreview}
        contextPreview={activeModelDialog ? `${activeModelDialog.triggerSource} • ${activeModelDialog.mode}` : undefined}
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
        onRun={closeModelDialog}
        onSavePreset={closeModelDialog}
      />
    </DashboardModelDialogContext.Provider>
  )
}

export function useDashboardModelDialog() {
  const context = useContext(DashboardModelDialogContext)

  if (!context) {
    throw new Error("useDashboardModelDialog must be used within DashboardModelDialogProvider")
  }

  return context
}
