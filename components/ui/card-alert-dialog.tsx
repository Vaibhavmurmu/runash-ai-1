"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CardAlert } from "@/components/ui/card-alert"

type CardAlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  severity?: "info" | "success" | "warning" | "danger"
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  confirmAriaLabel?: string
}

export function CardAlertDialog({
  open,
  onOpenChange,
  trigger,
  severity = "warning",
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirmAriaLabel,
}: CardAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent aria-describedby="card-alert-dialog-description">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription id="card-alert-dialog-description">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <CardAlert severity={severity} title={title} description={description} className="mt-1" />

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction aria-label={confirmAriaLabel ?? confirmLabel} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
