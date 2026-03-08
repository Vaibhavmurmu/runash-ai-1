"use client"

import { useEffect, useRef } from "react"
import { CreditCard, Lock } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type CheckoutPaymentMethodsProps = {
  clientSecret: string | null
  checkoutUrl: string | null
  disabled?: boolean
  loading?: boolean
  errorMessage?: string
  onInitializeCheckout: () => Promise<void>
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => {
      initEmbeddedCheckout: (options: {
        fetchClientSecret: () => Promise<string>
      }) => Promise<{ mount: (selector: string) => void; destroy: () => void }>
    }
  }
}

const CHECKOUT_CONTAINER_ID = "checkout-provider-element"

export function CheckoutPaymentMethods({
  clientSecret,
  checkoutUrl,
  disabled,
  loading,
  errorMessage,
  onInitializeCheckout,
}: CheckoutPaymentMethodsProps) {
  const embeddedCheckoutRef = useRef<{ destroy: () => void } | null>(null)
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

  useEffect(() => {
    if (!clientSecret || !hasPublishableKey) return

    let active = true

    const mountEmbeddedCheckout = async () => {
      if (!window.Stripe || !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) return
      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      const embeddedCheckout = await stripe.initEmbeddedCheckout({
        fetchClientSecret: async () => clientSecret,
      })

      if (!active) {
        embeddedCheckout.destroy()
        return
      }

      embeddedCheckout.mount(`#${CHECKOUT_CONTAINER_ID}`)
      embeddedCheckoutRef.current = embeddedCheckout
    }

    const script = document.createElement("script")
    script.src = "https://js.stripe.com/v3/"
    script.async = true
    script.onload = () => {
      void mountEmbeddedCheckout()
    }
    document.body.appendChild(script)

    return () => {
      active = false
      embeddedCheckoutRef.current?.destroy()
      embeddedCheckoutRef.current = null
    }
  }, [clientSecret, hasPublishableKey])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment Method</span>
          <Lock className="h-4 w-4 text-green-600" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPublishableKey && (
          <p className="text-sm text-amber-700">Stripe publishable key is missing. Configure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
        )}

        {!clientSecret && (
          <Button
            type="button"
            onClick={() => void onInitializeCheckout()}
            disabled={disabled || loading || !hasPublishableKey}
            className="w-full"
          >
            {loading ? "Preparing secure checkout..." : "Initialize Secure Checkout"}
          </Button>
        )}

        {clientSecret && <div id={CHECKOUT_CONTAINER_ID} className="min-h-[360px]" />}

        {!clientSecret && checkoutUrl && (
          <p className="text-xs text-muted-foreground">
            If embedded checkout is unavailable, secure checkout will continue in a hosted Stripe page.
          </p>
        )}

        {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
      </CardContent>
    </Card>
  )
}
