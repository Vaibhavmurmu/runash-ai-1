"use client"

import { useCallback, useState } from "react"

import type { ModelDialogContract } from "@/lib/types/model-dialog"

export function useModelDialog() {
  const [activeModelDialog, setActiveModelDialog] = useState<ModelDialogContract | null>(null)
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null)

  const openModelDialog = useCallback((payload: ModelDialogContract, originTrigger?: HTMLElement | null) => {
    setTriggerElement(originTrigger ?? null)
    setActiveModelDialog(payload)
  }, [])

  const closeModelDialog = useCallback(() => {
    setActiveModelDialog(null)
    if (triggerElement && typeof triggerElement.focus === "function") {
      triggerElement.focus()
    }
    setTriggerElement(null)
  }, [triggerElement])

  return {
    openModelDialog,
    closeModelDialog,
    isOpen: activeModelDialog !== null,
    activeModelDialog,
  }
}
