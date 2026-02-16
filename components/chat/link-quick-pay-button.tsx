"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type LinkQuickPayStatus = "idle" | "processing" | "success" | "failed"

interface LinkQuickPayButtonProps {
  last4: string
  eligibleForLink: boolean
  onPay: () => Promise<void> | void
  taxPreview?: number
  isDigitalProduct?: boolean
  itemName?: string
  amountLabel?: string
}

export default function LinkQuickPayButton({
  last4,
  eligibleForLink,
  onPay,
  taxPreview,
  isDigitalProduct = false,
  itemName = "RunAshChat Instant Checkout Item",
  amountLabel = "Proceed to payment",
}: LinkQuickPayButtonProps) {
  const [status, setStatus] = useState<LinkQuickPayStatus>("idle")

  const statusLabel = useMemo(() => {
    if (status === "processing") return "Processing Link payment…"
    if (status === "success") return "Payment completed via Link"
    if (status === "failed") return "Payment could not be completed"
    return null
  }, [status])

  const handlePay = async () => {
    if (!eligibleForLink || status === "processing") return

    setStatus("processing")
    try {
      await onPay()
      setStatus("success")
    } catch {
      setStatus("failed")
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900">
      <div className="grid gap-4 md:grid-cols-2 md:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{itemName}</h4>
            {eligibleForLink && isDigitalProduct && (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Sold through Link</Badge>
            )}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300">{amountLabel}</p>

          {typeof taxPreview === "number" && (
            <p className="text-xs text-gray-600 dark:text-gray-300">Estimated tax: {taxPreview.toFixed(2)}</p>
          )}

          {statusLabel ? (
            <p
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
        </div>

        <div className="flex w-full md:justify-end">
          <Button
            onClick={handlePay}
            disabled={!eligibleForLink || status === "processing"}
            className="w-full md:w-auto bg-gradient-to-r from-orange-600 to-yellow-500 text-white hover:from-orange-700 hover:to-yellow-600"
          >
            Pay with Link *{last4}
          </Button>
        </div>
      </div>
    </div>
  )
}
