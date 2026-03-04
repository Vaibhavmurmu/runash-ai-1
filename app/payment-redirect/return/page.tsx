"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

type CallbackResponse = {
  finalStatus: "completed" | "pending" | "failed" | "expired"
  checkoutSessionId: string
  provider: string
  providerTransactionReference: string
}

const statusToRoute: Record<CallbackResponse["finalStatus"], string> = {
  completed: "complete",
  pending: "pending",
  failed: "error",
  expired: "incomplete",
}

export default function PaymentRedirectReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("Validating payment status...")
  const [error, setError] = useState<string | null>(null)

  const callbackQuery = useMemo(() => {
    const params = new URLSearchParams()
    for (const key of ["state", "provider_ref", "checkout_session_id", "provider"]) {
      const value = searchParams?.get(key)
      if (value) params.set(key, value)
    }
    return params
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function resolveReturn() {
      if (!callbackQuery.get("state") || !callbackQuery.get("provider_ref")) {
        if (!cancelled) {
          setLoading(false)
          setError("Missing payment return state. Please retry checkout.")
        }
        return
      }

      try {
        const response = await fetch(`/api/v1/billing/checkout/callback?${callbackQuery.toString()}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || "Failed to validate return callback")
        }

        const data = payload.data as CallbackResponse
        if (cancelled) return

        const params = new URLSearchParams()
        params.set("state", callbackQuery.get("state") as string)
        params.set("provider", data.provider)
        params.set("provider_ref", data.providerTransactionReference)
        params.set("checkout_session_id", data.checkoutSessionId)

        router.replace(`/payment/status/${statusToRoute[data.finalStatus]}?${params.toString()}`)
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to validate payment callback")
          setLoading(false)
          setMessage("We couldn't validate the payment callback. You can retry checkout.")
        }
      }
    }

    resolveReturn()
    return () => {
      cancelled = true
    }
  }, [callbackQuery, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-3">
        {loading ? <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" /> : null}
        <h1 className="text-xl font-semibold">Payment return</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading ? (
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/checkout">Back to checkout</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/billing">Billing dashboard</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
