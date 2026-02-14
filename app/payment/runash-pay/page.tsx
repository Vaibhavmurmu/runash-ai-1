"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BadgeCheck, Link2, Receipt, Rocket, ShieldCheck, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface IntentResponse {
  success?: boolean
  data?: {
    id?: string
    clientSecret?: string
    amount?: number
    currency?: string
    status?: string
    metadata?: Record<string, unknown>
  }
  error?: {
    code?: string
    message?: string
  }
  requestId?: string
}

export default function RunAshPayPage() {
  const [amount, setAmount] = useState("999")
  const [currency, setCurrency] = useState("INR")
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [intentResponse, setIntentResponse] = useState<IntentResponse | null>(null)

  const createIntent = async () => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setIntentResponse({ error: { message: "Enter a valid amount greater than 0." } })
      return
    }

    setIsCreatingIntent(true)
    setIntentResponse(null)

    try {
      const response = await fetch("/api/v1/payment/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parsedAmount,
          currency,
          metadata: {
            source: "runash-pay-dashboard",
            initiatedAt: new Date().toISOString(),
          },
        }),
      })

      const data = (await response.json()) as IntentResponse
      setIntentResponse(data)
    } catch {
      setIntentResponse({ error: { message: "Unable to create payment intent right now." } })
    } finally {
      setIsCreatingIntent(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">RunAsh Pay</CardTitle>
          <CardDescription>
            Unified payment surface for Startup and Business teams with quick actions for links, intents,
            transactions, subscriptions, and onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Button asChild className="justify-between">
            <Link href="/ecommerce/payments">
              <span className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Create payment link
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="justify-between">
            <Link href="/payment/dashboard">
              <span className="inline-flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                View transactions
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/payment/subscription">
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Manage subscription
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/payment/startup">
              <span className="inline-flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                Startup onboarding
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link href="/payment/business">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Business onboarding
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div id="create-intent">
        <Card>
          <CardHeader>
            <CardTitle>Create payment intent</CardTitle>
            <CardDescription>
              Calls <code>/api/v1/payment/create-intent</code> and returns a request ID for reconciliation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="intent-amount">Amount</Label>
                <Input
                  id="intent-amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intent-currency">Currency</Label>
                <Input
                  id="intent-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>
            <Button onClick={createIntent} disabled={isCreatingIntent}>
              {isCreatingIntent ? "Creating..." : "Create payment intent"}
            </Button>

            {intentResponse && (
              <div className="rounded-md border p-3 text-sm space-y-1">
                {intentResponse.success ? (
                  <>
                    <p className="font-medium inline-flex items-center gap-2 text-green-700">
                      <BadgeCheck className="h-4 w-4" />
                      Intent created successfully
                    </p>
                    <p>Intent ID: {intentResponse.data?.id}</p>
                    <p>Status: {intentResponse.data?.status}</p>
                    <p>Request ID: {intentResponse.requestId}</p>
                  </>
                ) : (
                  <p className="text-red-600">
                    {intentResponse.error?.message ?? "Failed to create payment intent."}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
