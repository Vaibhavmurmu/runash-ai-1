"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type PaymentSectionKey = "methods" | "checkoutLinks" | "subscriptions" | "analytics" | "usage" | "portal" | "reporting"

type ApiEnvelope<T> = {
  success: boolean
  data: T | null
  error?: { code?: string; message?: string } | null
  requestId?: string
}

type Status = { kind: "success" | "error"; message: string } | null

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null

  return (
    <p
      className={status.kind === "success" ? "text-sm text-emerald-600" : "text-sm text-destructive"}
      role="status"
      aria-live="polite"
    >
      {status.message}
    </p>
  )
}

function SubmitButton({ isLoading, label }: { isLoading: boolean; label: string }) {
  return (
    <Button type="submit" disabled={isLoading} className="inline-flex items-center gap-2">
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {isLoading ? "Processing..." : label}
    </Button>
  )
}

function JsonPreview({ payload }: { payload: unknown }) {
  if (!payload) return null
  return <pre className="overflow-x-auto rounded border bg-muted p-3 text-xs">{JSON.stringify(payload, null, 2)}</pre>
}

export function PaymentMethodsSection() {
  const [currency, setCurrency] = useState("INR")
  const [methods, setMethods] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/v1/payment/methods?currency=${encodeURIComponent(currency.trim().toUpperCase())}`, {
        method: "GET",
      })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to fetch payment methods." })
        return
      }

      setMethods(payload.data)
      setStatus({ kind: "success", message: "Payment methods fetched successfully." })
    } catch {
      setStatus({ kind: "error", message: "Network error while fetching payment methods." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Fetch available methods from the live payment API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="methods-currency">Currency</Label>
            <Input id="methods-currency" value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value)} />
          </div>
          <SubmitButton isLoading={isLoading} label="Load methods" />
        </form>
        <StatusMessage status={status} />
        <JsonPreview payload={methods} />
      </CardContent>
    </Card>
  )
}

export function CheckoutLinksSection() {
  const [slug, setSlug] = useState("runash-link")
  const [amount, setAmount] = useState("999")
  const [currency, setCurrency] = useState("USD")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [result, setResult] = useState<unknown>(null)
  const [links, setLinks] = useState<Array<{ id: string; status: string; slug: string }>>([])

  const refreshLinks = async () => {
    const response = await fetch("/api/v1/payment/checkout-links", { method: "GET", cache: "no-store" })
    const payload = (await response.json()) as ApiEnvelope<Array<{ id: string; status: string; slug: string }>>
    if (response.ok && payload.success && payload.data) {
      setLinks(payload.data)
      setResult(payload.data)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setIsLoading(true)

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus({ kind: "error", message: "Provide a valid fixed amount greater than zero." })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/v1/payment/checkout-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: `${slug.trim().toLowerCase()}-${Date.now()}`,
          fixedAmount: parsedAmount,
          currency: currency.trim().toUpperCase(),
          status: "active",
        }),
      })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to create checkout link." })
        return
      }

      await refreshLinks()
      setStatus({ kind: "success", message: "Checkout link created successfully." })
    } catch {
      setStatus({ kind: "error", message: "Network error while creating checkout link." })
    } finally {
      setIsLoading(false)
    }
  }

  const runAction = async (id: string, body: Record<string, unknown>, success: string) => {
    setStatus(null)
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/payment/checkout-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Checkout link update failed." })
        return
      }
      await refreshLinks()
      setStatus({ kind: "success", message: success })
    } catch {
      setStatus({ kind: "error", message: "Network error while updating checkout link." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checkout Links</CardTitle>
        <CardDescription>Create, list, update, disable, and expire hosted checkout links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="checkout-slug">Link slug</Label>
            <Input id="checkout-slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkout-amount">Fixed amount</Label>
              <Input id="checkout-amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-currency">Currency</Label>
              <Input id="checkout-currency" maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton isLoading={isLoading} label="Create checkout link" />
            <Button type="button" variant="outline" onClick={refreshLinks} disabled={isLoading}>
              List links
            </Button>
          </div>
        </form>
        <StatusMessage status={status} />
        {links.length > 0 ? (
          <div className="space-y-2 rounded border p-3">
            {links.slice(0, 5).map((link) => (
              <div key={link.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{link.slug} · {link.status}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => runAction(link.id, { status: "active" }, "Checkout link activated.")}>Activate</Button>
                  <Button size="sm" variant="outline" onClick={() => runAction(link.id, { action: "disable" }, "Checkout link disabled.")}>Disable</Button>
                  <Button size="sm" variant="outline" onClick={() => runAction(link.id, { action: "expire" }, "Checkout link expired.")}>Expire</Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <JsonPreview payload={result} />
      </CardContent>
    </Card>
  )
}

export function SubscriptionSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [subscriptionData, setSubscriptionData] = useState<unknown>(null)

  const handleLoad = async () => {
    setStatus(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/v1/billing/subscription", { method: "GET", cache: "no-store" })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to fetch subscription details." })
        return
      }

      setSubscriptionData(payload.data)
      setStatus({ kind: "success", message: "Subscription details loaded." })
    } catch {
      setStatus({ kind: "error", message: "Network error while fetching subscription details." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>Load the active subscription state via billing APIs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" onClick={handleLoad} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Load subscription"}
        </Button>
        <StatusMessage status={status} />
        <JsonPreview payload={subscriptionData} />
      </CardContent>
    </Card>
  )
}

export function AnalyticsSection() {
  const [period, setPeriod] = useState("7d")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [analyticsData, setAnalyticsData] = useState<unknown>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/v1/analytics?period=${encodeURIComponent(period)}`, { method: "GET", cache: "no-store" })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to fetch analytics." })
        return
      }

      setAnalyticsData(payload.data)
      setStatus({ kind: "success", message: "Analytics loaded." })
    } catch {
      setStatus({ kind: "error", message: "Network error while fetching analytics." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>Query live analytics snapshots for payment operations and growth tracking.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="analytics-period">Period (24h, 7d, 30d)</Label>
            <Input id="analytics-period" value={period} onChange={(event) => setPeriod(event.target.value)} />
          </div>
          <SubmitButton isLoading={isLoading} label="Load analytics" />
        </form>
        <StatusMessage status={status} />
        <JsonPreview payload={analyticsData} />
      </CardContent>
    </Card>
  )
}

export function UsageBillingSection() {
  const [metric, setMetric] = useState("api_calls")
  const [amount, setAmount] = useState("1")
  const [summary, setSummary] = useState<unknown>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [isIncrementLoading, setIsIncrementLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const loadSummary = async () => {
    setStatus(null)
    setIsSummaryLoading(true)
    try {
      const response = await fetch("/api/v1/billing/usage", { method: "GET", cache: "no-store" })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to fetch usage summary." })
        return
      }
      setSummary(payload.data)
      setStatus({ kind: "success", message: "Usage summary refreshed." })
    } catch {
      setStatus({ kind: "error", message: "Network error while fetching usage summary." })
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const handleIncrement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setIsIncrementLoading(true)

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus({ kind: "error", message: "Usage increment must be greater than zero." })
      setIsIncrementLoading(false)
      return
    }

    try {
      const response = await fetch("/api/v1/billing/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: metric.trim(), amount: parsedAmount }),
      })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to increment usage." })
        return
      }

      setStatus({ kind: "success", message: "Usage incremented successfully." })
      await loadSummary()
    } catch {
      setStatus({ kind: "error", message: "Network error while incrementing usage." })
    } finally {
      setIsIncrementLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Billing</CardTitle>
        <CardDescription>Read usage and submit metered updates through billing APIs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleIncrement} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="usage-metric">Metric</Label>
              <Input id="usage-metric" value={metric} onChange={(event) => setMetric(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage-amount">Amount</Label>
              <Input id="usage-amount" type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton isLoading={isIncrementLoading} label="Increment usage" />
            <Button type="button" variant="outline" disabled={isSummaryLoading} onClick={loadSummary}>
              {isSummaryLoading ? "Refreshing..." : "Refresh usage summary"}
            </Button>
          </div>
        </form>
        <StatusMessage status={status} />
        <JsonPreview payload={summary} />
      </CardContent>
    </Card>
  )
}

export function CustomerPortalSection() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<unknown>(null)
  const [profile, setProfile] = useState<unknown>(null)
  const [actions, setActions] = useState<unknown>(null)

  const loadPortalContext = async () => {
    try {
      const [metricsResponse, profileResponse, actionsResponse] = await Promise.all([
        fetch("/api/v1/payment/profile/portal/metrics", { method: "GET", cache: "no-store" }),
        fetch("/api/v1/payment/profile/portal", { method: "GET", cache: "no-store" }),
        fetch("/api/v1/payment/profile/portal/lifecycle", { method: "GET", cache: "no-store" }),
      ])

      const metricsPayload = (await metricsResponse.json()) as ApiEnvelope<unknown>
      const profilePayload = (await profileResponse.json()) as ApiEnvelope<unknown>
      const actionsPayload = (await actionsResponse.json()) as ApiEnvelope<unknown>

      if (metricsResponse.ok && metricsPayload.success) setMetrics(metricsPayload.data)
      if (profileResponse.ok && profilePayload.success) setProfile(profilePayload.data)
      if (actionsResponse.ok && actionsPayload.success) setActions(actionsPayload.data)
    } catch {
      setStatus({ kind: "error", message: "Unable to load portal metrics context." })
    }
  }

  const openPortal = async () => {
    setStatus(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/v1/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ return_url: window.location.href }),
      })

      const payload = (await response.json()) as ApiEnvelope<{ url?: string }>
      if (!response.ok || !payload.success || !payload.data?.url) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to create portal session." })
        return
      }

      setPortalUrl(payload.data.url)
      await loadPortalContext()
      setStatus({ kind: "success", message: "Customer portal session generated." })
    } catch {
      setStatus({ kind: "error", message: "Network error while creating portal session." })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerLifecycle = async (actionType: "retry_failed_payment" | "subscription_state_change") => {
    setStatus(null)
    setIsLoading(true)
    try {
      const response = await fetch("/api/v1/payment/profile/portal/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType }),
      })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to trigger lifecycle action." })
        return
      }

      await loadPortalContext()
      setStatus({ kind: "success", message: `Lifecycle action '${actionType}' recorded.` })
    } catch {
      setStatus({ kind: "error", message: "Network error while applying lifecycle action." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Portal</CardTitle>
        <CardDescription>Manage billing/shipping profile, method lifecycle actions, and renewal health metrics.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={openPortal} disabled={isLoading}>
            {isLoading ? "Creating session..." : "Create portal session"}
          </Button>
          <Button variant="outline" onClick={loadPortalContext} disabled={isLoading}>
            Refresh metrics
          </Button>
          <Button variant="outline" onClick={() => triggerLifecycle("retry_failed_payment")} disabled={isLoading}>
            Retry failed payment
          </Button>
          <Button variant="outline" onClick={() => triggerLifecycle("subscription_state_change")} disabled={isLoading}>
            Manage subscription state
          </Button>
          {portalUrl ? (
            <Button asChild variant="outline">
              <a href={portalUrl} target="_blank" rel="noreferrer">
                Open portal
              </a>
            </Button>
          ) : null}
        </div>
        <StatusMessage status={status} />
        <div className="grid gap-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Portal metrics</p>
            <JsonPreview payload={metrics} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Billing/shipping profile</p>
            <JsonPreview payload={profile} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Recent lifecycle actions</p>
            <JsonPreview payload={actions} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TaxPayoutReportsSection() {
  const defaultFrom = useMemo(() => new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10), [])
  const defaultTo = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [reportData, setReportData] = useState<unknown>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)
    setIsLoading(true)

    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate })
      const response = await fetch(`/api/v1/payment/reporting?${params.toString()}`, { method: "GET" })
      const payload = (await response.json()) as ApiEnvelope<unknown>
      if (!response.ok || !payload.success) {
        setStatus({ kind: "error", message: payload.error?.message ?? "Failed to fetch payout/tax reports." })
        return
      }

      setReportData(payload.data)
      setStatus({ kind: "success", message: "Tax and payout reports loaded." })
    } catch {
      setStatus({ kind: "error", message: "Network error while fetching reports." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Payout Reports</CardTitle>
        <CardDescription>Load summarized payout and tax liabilities from reporting APIs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </div>
          <SubmitButton isLoading={isLoading} label="Load reports" />
        </form>
        <StatusMessage status={status} />
        <JsonPreview payload={reportData} />
      </CardContent>
    </Card>
  )
}
