"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error?: { message?: string }
}

type MethodRef = {
  id: string
  provider: string
  methodType: string
  last4: string | null
  expiryMonth: number | null
  expiryYear: number | null
  status: "active" | "disabled"
}

type BankAccount = {
  id: string
  bankName: string
  accountNumberMasked: string
  accountLast4: string
  ifscCode: string | null
  accountType: string
  currency: string
  isPrimary: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type Profile = {
  billingDetails: Record<string, unknown> | null
  billingAddress: Record<string, unknown> | null
  shippingAddress: Record<string, unknown> | null
  defaultPaymentMethodId: string | null
  backupPaymentMethodId: string | null
}

type InvoiceRecord = { id: string; status: string; amount_due: number | null; amount_paid: number | null; created_at: string }
type Subscription = { status: string; plan?: { name?: string } | null } | null

type AnalyticsSummary = {
  checkoutConversion?: { conversionRatePercent?: number }
  failedPaymentRecovery?: { recoveryRatePercent?: number }
  portalMetrics?: { renewalAtRisk?: number }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init })
  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? "Request failed")
  }
  return payload.data
}

export function CustomerPortalDashboard() {
  const [methods, setMethods] = useState<MethodRef[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [billingName, setBillingName] = useState("")
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    accountType: "savings",
    currency: "INR",
    isPrimary: false,
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [methodData, bankAccountData, profileData, subscriptionData, invoiceData, analyticsData] = await Promise.all([
        fetchJson<MethodRef[]>("/api/v1/payment/profile/methods"),
        fetchJson<BankAccount[]>("/api/v1/payment/profile/bank-accounts"),
        fetchJson<Profile>("/api/v1/payment/profile/portal"),
        fetchJson<Subscription>("/api/v1/billing/subscription"),
        fetchJson<{ invoices: InvoiceRecord[] }>("/api/v1/billing/invoices?limit=5"),
        fetchJson<AnalyticsSummary>("/api/v1/payment/analytics/summary"),
      ])

      setMethods(methodData)
      setBankAccounts(bankAccountData)
      setProfile(profileData)
      setSubscription(subscriptionData)
      setInvoices(invoiceData.invoices ?? [])
      setAnalytics(analyticsData)
      setBillingName(String((profileData.billingDetails as { name?: string } | null)?.name ?? ""))
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load portal data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const defaultMethod = useMemo(() => methods.find((method) => method.id === profile?.defaultPaymentMethodId) ?? null, [methods, profile])
  const backupMethod = useMemo(() => methods.find((method) => method.id === profile?.backupPaymentMethodId) ?? null, [methods, profile])

  const setMethodRole = async (id: string, role: "default" | "backup") => {
    setSaving(true)
    try {
      await fetchJson(`/api/v1/payment/profile/methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to switch payment method")
    } finally {
      setSaving(false)
    }
  }

  const saveBillingProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      await fetchJson("/api/v1/payment/profile/billing-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingDetails: { ...(profile?.billingDetails ?? {}), name: billingName.trim() },
          billingAddress: profile?.billingAddress ?? null,
        }),
      })
      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update billing profile")
    } finally {
      setSaving(false)
    }
  }

  const addBankAccount = async () => {
    setSaving(true)
    setError(null)
    try {
      await fetchJson<BankAccount>("/api/v1/payment/profile/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: bankAccountForm.bankName,
          accountNumber: bankAccountForm.accountNumber,
          ifscCode: bankAccountForm.ifscCode,
          accountHolderName: bankAccountForm.accountHolderName,
          accountType: bankAccountForm.accountType,
          currency: bankAccountForm.currency,
          isPrimary: bankAccountForm.isPrimary,
        }),
      })

      setBankAccountForm({
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        accountHolderName: "",
        accountType: "savings",
        currency: "INR",
        isPrimary: false,
      })

      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to add bank account")
    } finally {
      setSaving(false)
    }
  }

  const retryFailedPayments = async () => {
    setSaving(true)
    try {
      await fetchJson("/api/v1/payment/profile/portal/retry-failed-payment", { method: "POST" })
      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to queue retry")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Customer Billing Portal</CardTitle>
          <CardDescription>Manage methods, billing profile, subscription, invoices, and receipt visibility.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Button onClick={() => void loadAll()} disabled={loading || saving}>{loading ? "Refreshing..." : "Refresh portal"}</Button>
          {loading ? <Badge variant="outline">Loading</Badge> : <Badge variant="secondary">Ready</Badge>}
          {error ? <Badge variant="destructive">Error</Badge> : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>Set default and backup methods for instant checkout retries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3 text-sm">
              <p>Default: {defaultMethod ? `${defaultMethod.provider} •••• ${defaultMethod.last4 ?? "----"}` : "Not set"}</p>
              <p>Backup: {backupMethod ? `${backupMethod.provider} •••• ${backupMethod.last4 ?? "----"}` : "Not set"}</p>
            </div>
            {methods.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <p className="font-medium">{method.provider} •••• {method.last4 ?? "----"}</p>
                  <p className="text-muted-foreground">{method.methodType} · exp {method.expiryMonth ?? "--"}/{method.expiryYear ?? "----"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void setMethodRole(method.id, "default")}>Default</Button>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void setMethodRole(method.id, "backup")}>Backup</Button>
                  <Badge variant={method.status === "active" ? "secondary" : "destructive"}>{method.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing profile</CardTitle>
            <CardDescription>Billing/shipping identity used by Relay Agent + Stripe Link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="billing-name">Billing full name</label>
              <Input id="billing-name" value={billingName} onChange={(event) => setBillingName(event.target.value)} placeholder="Billing contact name" />
            </div>
            <Button onClick={() => void saveBillingProfile()} disabled={saving}>Save billing profile</Button>
            <p className="text-xs text-muted-foreground">Shipping profile is retained securely and reused for checkout autofill authorization.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>Add settlement bank accounts with server-validated details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Input
                value={bankAccountForm.bankName}
                onChange={(event) => setBankAccountForm((value) => ({ ...value, bankName: event.target.value }))}
                placeholder="Bank name"
              />
              <Input
                value={bankAccountForm.accountHolderName}
                onChange={(event) => setBankAccountForm((value) => ({ ...value, accountHolderName: event.target.value }))}
                placeholder="Account holder name"
              />
              <Input
                value={bankAccountForm.accountNumber}
                onChange={(event) => setBankAccountForm((value) => ({ ...value, accountNumber: event.target.value.replace(/\D/g, "") }))}
                placeholder="Account number (9-18 digits)"
              />
              <Input
                value={bankAccountForm.ifscCode}
                onChange={(event) => setBankAccountForm((value) => ({ ...value, ifscCode: event.target.value.toUpperCase() }))}
                placeholder="IFSC (e.g., HDFC0ABC123)"
              />
            </div>
            <Button onClick={() => void addBankAccount()} disabled={saving}>Add bank account</Button>
            {bankAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No bank accounts added yet.</p> : null}
            <div className="space-y-2">
              {bankAccounts.map((account) => (
                <div key={account.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{account.bankName} • {account.accountNumberMasked}</p>
                  <p className="text-muted-foreground">Type: {account.accountType} · IFSC: {account.ifscCode ?? "N/A"} · {account.currency}</p>
                  <div className="mt-2 flex gap-2">
                    {account.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
                    {account.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Monitor active status and trigger failed payment recovery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Status: <Badge variant={subscription?.status === "active" ? "secondary" : "outline"}>{subscription?.status ?? "none"}</Badge></p>
            <p>Plan: {subscription?.plan?.name ?? "No active plan"}</p>
            <p>Recovery rate: {Number(analytics?.failedPaymentRecovery?.recoveryRatePercent ?? 0).toFixed(1)}%</p>
            <p>Renewals at risk: {analytics?.portalMetrics?.renewalAtRisk ?? 0}</p>
            <Button variant="outline" onClick={() => void retryFailedPayments()} disabled={saving}>Retry failed payments</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices & receipts</CardTitle>
            <CardDescription>Latest invoices and receipt retrieval status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices found.</p> : null}
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <p className="font-medium">{invoice.id}</p>
                  <p className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p>Due: {invoice.amount_due ?? 0}</p>
                  <p>Paid: {invoice.amount_paid ?? 0}</p>
                </div>
                <Badge variant="outline">{invoice.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
