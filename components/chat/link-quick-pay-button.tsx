"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type LinkQuickPayStatus = "idle" | "processing" | "success" | "failed"

interface LinkQuickPayButtonProps {
  last4: string
  eligibleForLink: boolean
  onPay: () => Promise<void> | void
  onRetry?: () => Promise<void> | void
  taxPreview?: number
  isDigitalProduct?: boolean
  itemName?: string
  amountLabel?: string
  subtotal?: number
  taxAmount?: number
  totalAmount?: number
  taxLabel?: "GST" | "VAT" | "Sales Tax"
  blockedReason?: string
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    if (error.message === "user_cancelled_confirmation") {
      return "Confirmation was cancelled. Review totals and retry when ready."
    }

    if (error.message === "missing_confirmation_payload") {
      return "Unable to prepare Link checkout details. Please retry from chat."
    }

    return "Link checkout failed. Please retry."
  }

  return "Link checkout failed. Please retry."
}

export default function LinkQuickPayButton({
  last4,
  eligibleForLink,
  onPay,
  onRetry,
  taxPreview,
  isDigitalProduct = false,
  itemName = "RunAshChat Instant Checkout Item",
  amountLabel = "Proceed to payment",
  subtotal,
  taxAmount,
  totalAmount,
  taxLabel,
  blockedReason,
}: LinkQuickPayButtonProps) {
  const [status, setStatus] = useState<LinkQuickPayStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const statusLabel = useMemo(() => {
    if (status === "processing") return "Processing Link payment…"
    if (status === "success") return "Payment completed via Link"
    if (status === "failed") return "Payment could not be completed. Retry to continue checkout."
    return null
  }, [status])

  const isLoading = status === "processing"
  const isDisabled = !eligibleForLink || isLoading || status === "success"

  const handlePay = async () => {
    if (!eligibleForLink || isLoading) return

    setStatus("processing")
    setErrorMessage(null)

    try {
      if (status === "failed" && onRetry) {
        await onRetry()
      } else {
        await onPay()
      }
      setStatus("success")
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
      setStatus("failed")
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900" aria-busy={isLoading}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{itemName}</h4>
            {eligibleForLink && isDigitalProduct ? (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Sold through Link</Badge>
            ) : null}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300">{amountLabel}</p>

          {typeof taxPreview === "number" ? (
            <p className="text-xs text-gray-600 dark:text-gray-300">Estimated tax: {taxPreview.toFixed(2)}</p>
          ) : null}

          {typeof subtotal === "number" && typeof taxAmount === "number" && typeof totalAmount === "number" ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <p>Subtotal: {subtotal.toFixed(2)}</p>
              <p>
                {taxLabel ?? "Tax"}: {taxAmount.toFixed(2)}
              </p>
              <p className="font-semibold">Total: {totalAmount.toFixed(2)}</p>
            </div>
          ) : null}

          {blockedReason === "final_charge_blocked_until_user_confirms_after_tax_preview" ? (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Final charge is blocked until you confirm after reviewing subtotal, tax, and total.
            </p>
          ) : null}

          {statusLabel ? (
            <p
              aria-live="polite"
              className={`text-xs font-medium ${
                status === "failed"
                  ? "text-red-600 dark:text-red-400"
                  : status === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {statusLabel}
            </p>
          ) : null}

          {errorMessage ? <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p> : null}
        </div>

        <div className="flex w-full flex-col gap-2 md:items-end">
          <Button
            type="button"
            onClick={handlePay}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-label={status === "failed" ? `Retry Pay with Link *${last4}` : `Pay with Link *${last4}`}
            className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white hover:from-orange-700 hover:to-yellow-600 md:w-auto"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Pay with Link *{last4}
            {isLoading ? <span className="sr-only">Payment is processing</span> : null}
          </Button>

          {status === "failed" ? (
            <Button type="button" variant="outline" onClick={handlePay} disabled={isLoading} className="w-full md:w-auto">
              Retry payment
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
