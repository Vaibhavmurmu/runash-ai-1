"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock4, Download, Home, RefreshCw, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const allowedStates = ["success", "error", "incomplete", "pending", "complete"] as const

type AllowedState = (typeof allowedStates)[number]

type PaymentStatusApiResponse = {
  routeState: AllowedState
  resolvedStatus: "complete" | "pending" | "error" | "incomplete"
  checkoutSessionId: string
  provider: string
  providerTransactionReference: string | null
  attemptId: string | null
  invoiceDownloadUrl: string | null
  summary: {
    grossAmount: number | null
    netAmount: number | null
    processingFeeAmount: number | null
    taxAmount: number | null
    settlementCurrency: string | null
    occurredAt: string | null
    resultCode: string | null
    resultMessage: string | null
  }
  shouldRedirect: boolean
}

const stateUi: Record<AllowedState, { title: string; message: string; icon: typeof CheckCircle2 }> = {
  success: { title: "Payment successful", message: "Your payment was captured successfully.", icon: CheckCircle2 },
  complete: { title: "Payment complete", message: "Your transaction is complete and reflected in billing.", icon: CheckCircle2 },
  pending: { title: "Payment pending", message: "We are still waiting for confirmation from your provider.", icon: Clock4 },
  incomplete: { title: "Payment incomplete", message: "The payment was started but not fully completed.", icon: AlertCircle },
  error: { title: "Payment error", message: "The payment could not be completed.", icon: ShieldAlert },
}

function getRecommendedActions(state: AllowedState, invoiceDownloadUrl: string | null) {
  const base = [
    { label: "Retry payment", href: "/checkout", icon: RefreshCw },
    { label: "Return to dashboard", href: "/dashboard/billing", icon: Home },
    { label: "Contact support", href: "/support", icon: ShieldAlert },
  ]

  if (invoiceDownloadUrl && (state === "success" || state === "complete")) {
    return [{ label: "Download invoice", href: invoiceDownloadUrl, icon: Download }, ...base]
  }

  return base
}

function formatAmount(value: number | null, currency: string | null) {
  if (typeof value !== "number") return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value / 100)
}

export default function PaymentStatusPage() {
  const router = useRouter()
  const params = useParams<{ state: string }>()
  const searchParams = useSearchParams()
  const routeState = (params?.state ?? "pending") as AllowedState
  const [data, setData] = useState<PaymentStatusApiResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const requestQuery = useMemo(() => {
    const query = new URLSearchParams()
    for (const key of ["state", "provider_ref", "checkout_session_id", "provider"]) {
      const value = searchParams.get(key)
      if (value) query.set(key, value)
    }
    query.set("status_route", routeState)
    return query
  }, [routeState, searchParams])

  useEffect(() => {
    if (!allowedStates.includes(routeState)) {
      router.replace("/payment/status/pending")
      return
    }

    let cancelled = false

    async function loadStatus() {
      try {
        const response = await fetch(`/api/v1/payment/status?${requestQuery.toString()}`, { cache: "no-store" })
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success || !payload?.data) {
          throw new Error(payload?.error?.message || "Unable to load payment status.")
        }

        const nextData = payload.data as PaymentStatusApiResponse
        if (cancelled) return

        if (nextData.shouldRedirect && nextData.routeState !== routeState) {
          router.replace(`/payment/status/${nextData.routeState}?${requestQuery.toString()}`)
          return
        }

        setData(nextData)
        setErrorMessage(null)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load payment status.")
          setData(null)
        }
      }
    }

    loadStatus()

    return () => {
      cancelled = true
    }
  }, [requestQuery, routeState, router])

  const resolvedState = data?.routeState ?? routeState
  const ui = stateUi[allowedStates.includes(resolvedState) ? resolvedState : "pending"]
  const Icon = ui.icon
  const actions = getRecommendedActions(resolvedState, data?.invoiceDownloadUrl ?? null)

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle>{ui.title}</CardTitle>
          <CardDescription>{ui.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Transaction summary</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4"><dt>Total charged</dt><dd>{formatAmount(data?.summary.grossAmount ?? null, data?.summary.settlementCurrency ?? null)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Net amount</dt><dd>{formatAmount(data?.summary.netAmount ?? null, data?.summary.settlementCurrency ?? null)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Processing fee</dt><dd>{formatAmount(data?.summary.processingFeeAmount ?? null, data?.summary.settlementCurrency ?? null)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Tax</dt><dd>{formatAmount(data?.summary.taxAmount ?? null, data?.summary.settlementCurrency ?? null)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Provider</dt><dd className="uppercase">{data?.provider ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Recorded at</dt><dd>{data?.summary.occurredAt ? new Date(data.summary.occurredAt).toLocaleString() : "—"}</dd></div>
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Attempt & references</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt>Checkout session</dt><dd className="font-mono text-xs">{data?.checkoutSessionId ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Attempt ID</dt><dd className="font-mono text-xs">{data?.attemptId ?? "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt>Provider reference</dt><dd className="font-mono text-xs">{data?.providerTransactionReference ?? "—"}</dd></div>
            </dl>
          </section>

          <section className="rounded-lg bg-muted/40 p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recommended next action</h2>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button asChild key={action.label} variant={action.label === "Download invoice" ? "default" : "outline"}>
                  <Link href={action.href}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">Status is resolved from backend payment records and provider state verification.</CardFooter>
      </Card>
    </main>
  )
}
