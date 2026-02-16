"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  accountHolderName: string
  accountType: string
  currency: string
  isPrimary: boolean
  isActive: boolean
  archivedAt: string | null
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

type BankAccountFormState = {
  bankName: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  accountType: string
  currency: string
  isPrimary: boolean
}

const defaultBankAccountForm: BankAccountFormState = {
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  accountHolderName: "",
  accountType: "savings",
  currency: "INR",
  isPrimary: false,
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
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountFormState>(defaultBankAccountForm)

  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    bankName: "",
    accountHolderName: "",
    ifscCode: "",
    accountType: "savings",
    currency: "INR",
    isPrimary: false,
  })
  const [confirmAction, setConfirmAction] = useState<{ type: "archive" | "delete"; account: BankAccount } | null>(null)

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

      setBankAccountForm(defaultBankAccountForm)
      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to add bank account")
    } finally {
      setSaving(false)
    }
  }

  const openEditAccount = (account: BankAccount) => {
    setEditingAccount(account)
    setEditForm({
      bankName: account.bankName,
      accountHolderName: account.accountHolderName,
      ifscCode: account.ifscCode ?? "",
      accountType: account.accountType,
      currency: account.currency,
      isPrimary: account.isPrimary,
    })
    setIsEditModalOpen(true)
  }

  const submitEditAccount = async () => {
    if (!editingAccount) return

    setSaving(true)
    setError(null)
    try {
      await fetchJson<BankAccount>(`/api/v1/payment/profile/bank-accounts/${editingAccount.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: editForm.bankName,
          accountHolderName: editForm.accountHolderName || undefined,
          ifscCode: editForm.ifscCode,
          accountType: editForm.accountType,
          currency: editForm.currency,
          isPrimary: editForm.isPrimary,
        }),
      })
      setIsEditModalOpen(false)
      setEditingAccount(null)
      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update bank account")
    } finally {
      setSaving(false)
    }
  }

  const handleArchiveOrDelete = async () => {
    if (!confirmAction) return

    setSaving(true)
    setError(null)
    try {
      await fetchJson(`/api/v1/payment/profile/bank-accounts/${confirmAction.account.id}`, {
        method: "DELETE",
      })
      setConfirmAction(null)
      await loadAll()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to archive bank account")
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
            <CardDescription>Add and manage settlement bank accounts with ownership checks and soft-archive controls.</CardDescription>
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bankAccountForm.isPrimary}
                  onChange={(event) => setBankAccountForm((value) => ({ ...value, isPrimary: event.target.checked }))}
                />
                Set as primary
              </label>
            </div>
            <Button onClick={() => void addBankAccount()} disabled={saving}>Add bank account</Button>
            {bankAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No bank accounts added yet.</p> : null}
            <div className="space-y-2">
              {bankAccounts.map((account) => (
                <div key={account.id} className="rounded border p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{account.bankName} • {account.accountNumberMasked}</p>
                      <p className="text-muted-foreground">Type: {account.accountType} · IFSC: {account.ifscCode ?? "N/A"} · {account.currency}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => openEditAccount(account)}>Manage</Button>
                      <Button size="sm" variant="outline" disabled={saving || !account.isActive} onClick={() => setConfirmAction({ type: "archive", account })}>Archive</Button>
                      <Button size="sm" variant="destructive" disabled={saving || !account.isActive} onClick={() => setConfirmAction({ type: "delete", account })}>Delete</Button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {account.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
                    {account.isActive ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Archived</Badge>}
                    {account.archivedAt ? <Badge variant="outline">Archived {new Date(account.archivedAt).toLocaleDateString()}</Badge> : null}
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

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit bank account</DialogTitle>
            <DialogDescription>Update account details and primary-account status. Ownership is verified server-side.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2">
            <Input value={editForm.bankName} onChange={(event) => setEditForm((value) => ({ ...value, bankName: event.target.value }))} placeholder="Bank name" />
            <Input value={editForm.accountHolderName} onChange={(event) => setEditForm((value) => ({ ...value, accountHolderName: event.target.value }))} placeholder="Account holder name" />
            <Input value={editForm.ifscCode} onChange={(event) => setEditForm((value) => ({ ...value, ifscCode: event.target.value.toUpperCase() }))} placeholder="IFSC" />
            <Input value={editForm.accountType} onChange={(event) => setEditForm((value) => ({ ...value, accountType: event.target.value }))} placeholder="Account type" />
            <Input value={editForm.currency} onChange={(event) => setEditForm((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} placeholder="Currency" />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.isPrimary}
                onChange={(event) => setEditForm((value) => ({ ...value, isPrimary: event.target.checked }))}
              />
              Mark as primary account
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submitEditAccount()} disabled={saving || !editingAccount}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.type === "archive" ? "Archive bank account?" : "Delete bank account?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "archive"
                ? "This action soft-archives the account by setting it inactive and storing archived_at."
                : "Delete action is implemented as a safe soft-delete archive for auditability."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void handleArchiveOrDelete() }}>
              {saving ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
