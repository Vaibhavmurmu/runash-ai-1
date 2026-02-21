"use client"

import { useCallback, useState } from "react"

import type { ModelDialogContract } from "@/lib/types/model-dialog"

export function useModelDialog() {
  const [activeModelDialog, setActiveModelDialog] = useState<ModelDialogContract | null>(null)

  const openModelDialog = useCallback((payload: ModelDialogContract) => {
    setActiveModelDialog(payload)
  }, [])

  const closeModelDialog = useCallback(() => {
    setActiveModelDialog(null)
  }, [])

  return {
    openModelDialog,
    closeModelDialog,
    isOpen: activeModelDialog !== null,
    activeModelDialog,
  }
}
