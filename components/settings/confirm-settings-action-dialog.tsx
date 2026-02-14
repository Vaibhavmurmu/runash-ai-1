"use client"

import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmSettingsActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  consequence: string
  confirmLabel: string
  cancelLabel?: string
  loadingLabel?: string
  successMessage?: string
  irreversibleWarning?: string
  destructive?: boolean
  onConfirm: () => Promise<void>
}

export function ConfirmSettingsActionDialog({
  open,
  onOpenChange,
  title,
  description,
  consequence,
  confirmLabel,
  cancelLabel = "Cancel",
  loadingLabel = "Processing...",
  successMessage = "Action completed successfully.",
  irreversibleWarning,
  destructive = true,
  onConfirm,
}: ConfirmSettingsActionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false)
      setIsComplete(false)
      setErrorMessage("")
    }
  }, [open])

  const handleConfirm = async () => {
    setErrorMessage("")
    setIsSubmitting(true)
    try {
      await onConfirm()
      setIsComplete(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Action failed. Please retry.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => (!isSubmitting ? onOpenChange(nextOpen) : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 text-sm">
          <p className="text-foreground">{consequence}</p>
          {irreversibleWarning ? <p className="font-medium text-destructive">{irreversibleWarning}</p> : null}
          {errorMessage ? <p className="font-medium text-destructive">{errorMessage}</p> : null}
          {isComplete ? <p className="font-medium text-emerald-600">{successMessage}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{isComplete ? "Close" : cancelLabel}</AlertDialogCancel>
          {isComplete ? (
            <AlertDialogAction onClick={() => onOpenChange(false)}>Done</AlertDialogAction>
          ) : (
            <AlertDialogAction
              className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirm()
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? loadingLabel : confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
