"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"

type RedirectOrchestrationState = {
  checkoutSessionId?: string
  provider?: string
  providerTransactionReference?: string
  state?: string
  redirectUrl: string
  returnUrlSuccess?: string
  returnUrlPending?: string
  returnUrlFailed?: string
  createdAt: string
}

export default function PaymentRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state } = useCart()
  const { cart } = state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const orderIdParam = searchParams?.get("order_id") || null

  useEffect(() => {
    let cancelled = false

    async function startFlow() {
      setError(null)
      try {
        let orderId = orderIdParam
        if (!orderId) {
          const pending = typeof window !== "undefined" ? sessionStorage.getItem("pendingOrder") : null
          if (!pending) {
            throw new Error("No pending order available. Please retry from checkout.")
          }
          const orderPayload = JSON.parse(pending)
          const createRes = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderPayload),
          })
          if (!createRes.ok) {
            const e = await createRes.json().catch(() => null)
            throw new Error(e?.error || "Failed to create order on server")
          }
          const created = await createRes.json()
          orderId = created?.id
          if (orderId) {
            sessionStorage.setItem("pendingOrderId", orderId)
          }
        }

        if (!orderId) {
          throw new Error("Failed to obtain an order id")
        }

        const sessionRes = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            successUrl: window.location.origin + `/payment-redirect/return`,
            cancelUrl: window.location.origin + "/payment-redirect/return?status=failed",
          }),
        })

        const sessionData = await sessionRes.json()
        const redirectUrl = sessionData.redirectUrl || sessionData.url
        if (!sessionRes.ok || !redirectUrl) {
          throw new Error(sessionData?.error || "Failed to create checkout session")
        }

        const checkoutAttemptState: RedirectOrchestrationState = {
          checkoutSessionId: sessionData.checkoutSessionId,
          provider: sessionData.provider || "stripe",
          providerTransactionReference: sessionData.providerTransactionReference || sessionData.checkoutSessionId,
          state: sessionData.state,
          redirectUrl,
          returnUrlSuccess: sessionData.returnUrlSuccess,
          returnUrlPending: sessionData.returnUrlPending,
          returnUrlFailed: sessionData.returnUrlFailed,
          createdAt: new Date().toISOString(),
        }

        sessionStorage.setItem("checkoutRedirectAttempt", JSON.stringify(checkoutAttemptState))
        window.location.href = redirectUrl
      } catch (err: any) {
        if (!cancelled) {
          console.error("Payment flow error:", err)
          setError(err?.message || String(err))
          setLoading(false)
        }
      }
    }

    startFlow()
    return () => {
      cancelled = true
    }
  }, [retryCount, orderIdParam, cart.items.length])

  const onRetry = () => {
    setLoading(true)
    setError(null)
    setRetryCount((c) => c + 1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        {loading && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold">Preparing secure payment...</h2>
            <p className="text-sm text-gray-600 mt-2">You will be redirected to a secure checkout page shortly.</p>
          </>
        )}

        {!loading && error && (
          <div>
            <h2 className="text-lg font-semibold text-red-600">Unable to start payment</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-4 flex justify-center space-x-2">
              <Button onClick={onRetry}>Retry</Button>
              <Button variant="ghost" onClick={() => router.push("/checkout")}>Back to Checkout</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
