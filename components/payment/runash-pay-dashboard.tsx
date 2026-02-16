"use client"

import Link from "next/link"
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TxStatus = "pending" | "processing" | "completed" | "failed" | "refunded"
type PaymentRequestStatus = "pending" | "fulfilled" | "cancelled"
type BillPaymentStatus = "scheduled" | "paid" | "failed"

type Transaction = {
  id: string
  amount: number
  currency: string
  status: TxStatus
  paymentMethod: string
  provider: string
  createdAt: string
}

type PaymentRequest = {
  id: string
  payerName: string
  amount: number
  note: string | null
  status: PaymentRequestStatus
}

type BillPayment = {
  id: string
  billerName: string
  amount: number
  dueDate: string | null
  status: BillPaymentStatus
}

type DashboardCardProps = {
  title: string
  description: string
  children: ReactNode
}

type QuickAction = {
  href: string
  label: string
  variant?: "default" | "secondary"
}

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" })
  const payload = await response.json()
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "Request failed")
  }
  return payload.data as T
}

function DashboardCard({ title, description, children }: DashboardCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function DashboardHeader({ balance, summaryLoading, summaryError, onRefresh }: { balance: number; summaryLoading: boolean; summaryError: string | null; onRefresh: () => void }) {
  return (
    <DashboardCard title="RunAsh Pay Dashboard" description="Instant checkout operations for RunAshChat + Stripe Link relay.">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {summaryLoading ? "Loading..." : formatCurrency(balance)}
          </p>
          {summaryError ? <p className="text-sm text-destructive">{summaryError}</p> : null}
        </div>
        <Button onClick={onRefresh} variant="outline" className="focus-visible:ring-2 focus-visible:ring-primary">
          Refresh balance
        </Button>
      </div>
    </DashboardCard>
  )
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <DashboardCard title="Quick actions" description="Frequent payment tasks for checkout and support teams.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="list" aria-label="Quick payment actions">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant ?? "secondary"}
            className="w-full focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link href={action.href} aria-label={`Open ${action.label} flow`}>
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </DashboardCard>
  )
}

function TransactionSkeletonRow() {
  return <div className="h-16 animate-pulse rounded-lg border bg-muted/50" aria-hidden="true" />
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function TransactionRow({ tx, statusVariant }: { tx: Transaction; statusVariant: "default" | "secondary" | "outline" | "destructive" }) {
  return (
    <article
      className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
      aria-label={`Transaction ${tx.id} ${tx.status}`}
      tabIndex={0}
    >
      <div>
        <p className="font-medium leading-tight">{tx.id}</p>
        <p className="text-xs text-muted-foreground">{tx.paymentMethod} · {tx.provider}</p>
      </div>
      <div className="text-left sm:text-right">
        <p className="font-medium">{formatCurrency(tx.amount, tx.currency)}</p>
        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
      </div>
      <Badge variant={statusVariant} className="w-fit capitalize">
        {tx.status}
      </Badge>
    </article>
  )
}

function BottomNav() {
  const items = [
    { href: "/payment/dashboard", label: "Dashboard" },
    { href: "/payment/runash-pay", label: "RunAsh Pay" },
    { href: "/payment/portal", label: "Portal" },
    { href: "/payment/invoices", label: "Invoices" },
  ]

  return (
    <nav
      aria-label="Payment dashboard bottom navigation"
      className="sticky bottom-3 z-10 mt-2 rounded-xl border bg-background/90 p-2 shadow backdrop-blur"
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-md border px-3 py-2 text-center text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Navigate to ${item.label}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function PaymentVisualQAChecklist() {
  const checklist = [
    "Balance and transaction totals are readable at mobile and desktop widths.",
    "Quick actions route correctly to Send, Request, Scan, and Bills.",
    "Transaction rows show clear status badges, timestamps, and accessible focus rings.",
    "Payment request and bill forms keep labels, helper text, and error contrast compliant.",
    "Loading skeletons and empty states appear before API data is available.",
  ]

  return (
    <DashboardCard title="Visual QA checklist" description="Payment-critical UI checks for release validation.">
      <ul className="space-y-2 text-sm" aria-label="Visual QA checklist for payment-critical components">
        {checklist.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  )
}

export function RunAshPayDashboard() {
  const [balance, setBalance] = useState(0)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txTotalPages, setTxTotalPages] = useState(1)
  const [txLoading, setTxLoading] = useState(true)
  const [txError, setTxError] = useState<string | null>(null)
  const [txStatusFilter, setTxStatusFilter] = useState("all")
  const [txSearch, setTxSearch] = useState("")

  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [bills, setBills] = useState<BillPayment[]>([])
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [requestForm, setRequestForm] = useState({ payerName: "", amount: "", note: "" })
  const [billForm, setBillForm] = useState({ billerName: "", amount: "", dueDate: "" })

  const loadSummary = useCallback(async () => {
    try {
      setSummaryError(null)
      setSummaryLoading(true)
      const data = await fetchJson<{ balance: number }>("/api/v1/payment/summary")
      setBalance(data.balance)
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Failed to fetch summary")
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const loadTransactions = useCallback(async () => {
    try {
      setTxError(null)
      setTxLoading(true)
      const params = new URLSearchParams({ page: String(txPage), limit: "8", status: txStatusFilter, query: txSearch })
      const data = await fetchJson<{ records: Transaction[]; pagination: { totalPages: number } }>(
        `/api/v1/payment/transactions?${params.toString()}`,
      )
      setTransactions(data.records)
      setTxTotalPages(data.pagination.totalPages)
    } catch (error) {
      setTxError(error instanceof Error ? error.message : "Failed to fetch transactions")
    } finally {
      setTxLoading(false)
    }
  }, [txPage, txSearch, txStatusFilter])

  const loadActionsData = useCallback(async () => {
    const [requestData, billData] = await Promise.all([
      fetchJson<PaymentRequest[]>("/api/v1/payment/requests"),
      fetchJson<BillPayment[]>("/api/v1/payment/bill-payments"),
    ])
    setRequests(requestData)
    setBills(billData)
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    void loadActionsData().catch((error) => setMutationError(error instanceof Error ? error.message : "Failed to load actions"))
  }, [loadActionsData])

  const txStatusBadge = useMemo(
    () =>
      ({
        completed: "default",
        pending: "secondary",
        processing: "secondary",
        refunded: "outline",
        failed: "destructive",
      }) as const,
    [],
  )

  const refreshBalance = async () => {
    await Promise.all([loadSummary(), loadTransactions()])
  }

  const createPaymentRequestAction = async () => {
    if (!requestForm.payerName || !requestForm.amount) return

    setMutationError(null)
    const optimistic: PaymentRequest = {
      id: `tmp-${Date.now()}`,
      payerName: requestForm.payerName,
      amount: Number(requestForm.amount),
      note: requestForm.note || null,
      status: "pending",
    }

    const previous = requests
    setRequests((current) => [optimistic, ...current])

    try {
      const created = await fetchJson<PaymentRequest>("/api/v1/payment/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerName: requestForm.payerName,
          amount: Number(requestForm.amount),
          note: requestForm.note || undefined,
        }),
      })
      setRequests((current) => [created, ...current.filter((item) => item.id !== optimistic.id)])
      setRequestForm({ payerName: "", amount: "", note: "" })
    } catch (error) {
      setRequests(previous)
      setMutationError(error instanceof Error ? error.message : "Failed to create payment request")
    }
  }

  const updateRequestStatus = async (id: string, status: PaymentRequestStatus) => {
    const previous = requests
    setRequests((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      const updated = await fetchJson<PaymentRequest>(`/api/v1/payment/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      setRequests((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch (error) {
      setRequests(previous)
      setMutationError(error instanceof Error ? error.message : "Failed to update payment request")
    }
  }

  const createBillPaymentAction = async () => {
    if (!billForm.billerName || !billForm.amount) return

    setMutationError(null)
    const optimistic: BillPayment = {
      id: `tmp-${Date.now()}`,
      billerName: billForm.billerName,
      amount: Number(billForm.amount),
      dueDate: billForm.dueDate || null,
      status: "scheduled",
    }

    const previous = bills
    setBills((current) => [optimistic, ...current])

    try {
      const created = await fetchJson<BillPayment>("/api/v1/payment/bill-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billerName: billForm.billerName,
          amount: Number(billForm.amount),
          dueDate: billForm.dueDate || undefined,
        }),
      })
      setBills((current) => [created, ...current.filter((item) => item.id !== optimistic.id)])
      setBillForm({ billerName: "", amount: "", dueDate: "" })
    } catch (error) {
      setBills(previous)
      setMutationError(error instanceof Error ? error.message : "Failed to create bill payment")
    }
  }

  const updateBillStatus = async (id: string, status: BillPaymentStatus) => {
    const previous = bills
    setBills((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      const updated = await fetchJson<BillPayment>(`/api/v1/payment/bill-payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      setBills((current) => current.map((item) => (item.id === id ? updated : item)))
    } catch (error) {
      setBills(previous)
      setMutationError(error instanceof Error ? error.message : "Failed to update bill payment")
    }
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:space-y-8">
      <DashboardHeader
        balance={balance}
        summaryLoading={summaryLoading}
        summaryError={summaryError}
        onRefresh={() => {
          void refreshBalance()
        }}
      />

      <QuickActions
        actions={[
          { href: "/send", label: "Send", variant: "default" },
          { href: "/request", label: "Request" },
          { href: "/scan", label: "Scan" },
          { href: "/bills", label: "Bills" },
        ]}
      />

      <DashboardCard title="Transaction history" description="Server-backed search, filtering, and pagination.">
        <div className="grid gap-3 md:grid-cols-2" role="group" aria-label="Transaction filters">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Search</span>
            <input
              className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Search by id, method, provider"
              aria-label="Search transactions"
              value={txSearch}
              onChange={(event) => {
                setTxPage(1)
                setTxSearch(event.target.value)
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={txStatusFilter}
              aria-label="Filter transaction status"
              onChange={(event) => {
                setTxPage(1)
                setTxStatusFilter(event.target.value)
              }}
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
        </div>

        {txError ? <p className="text-sm text-destructive">{txError}</p> : null}

        <div className="space-y-2">
          {txLoading
            ? Array.from({ length: 4 }).map((_, index) => <TransactionSkeletonRow key={`tx-skeleton-${index}`} />)
            : null}

          {!txLoading && transactions.length === 0 ? (
            <EmptyState title="No transactions found" description="Try broadening your search or changing the status filter." />
          ) : null}

          {!txLoading
            ? transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} statusVariant={txStatusBadge[tx.status]} />)
            : null}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={txPage <= 1}
            onClick={() => setTxPage((value) => value - 1)}
            className="focus-visible:ring-2 focus-visible:ring-primary"
          >
            Previous
          </Button>
          <p className="text-xs text-muted-foreground">Page {txPage} / {txTotalPages}</p>
          <Button
            variant="outline"
            size="sm"
            disabled={txPage >= txTotalPages}
            onClick={() => setTxPage((value) => value + 1)}
            className="focus-visible:ring-2 focus-visible:ring-primary"
          >
            Next
          </Button>
        </div>
      </DashboardCard>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Payment operations">
        <DashboardCard title="Payment requests" description="Create/update request actions with optimistic UI.">
          <div className="grid gap-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Payer name</span>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Payer name"
                value={requestForm.payerName}
                onChange={(event) => setRequestForm((value) => ({ ...value, payerName: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Amount</span>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Amount"
                type="number"
                value={requestForm.amount}
                onChange={(event) => setRequestForm((value) => ({ ...value, amount: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Note</span>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Note (optional)"
                value={requestForm.note}
                onChange={(event) => setRequestForm((value) => ({ ...value, note: event.target.value }))}
              />
            </label>
            <Button size="sm" onClick={() => void createPaymentRequestAction()} className="focus-visible:ring-2 focus-visible:ring-primary">
              Create request
            </Button>
          </div>

          {requests.length === 0 ? <EmptyState title="No payment requests" description="Create a request to start collecting customer payments." /> : null}

          {requests.map((request) => (
            <div key={request.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{request.payerName}</p>
                <Badge variant="outline" className="capitalize">{request.status}</Badge>
              </div>
              <p className="text-sm">{formatCurrency(request.amount)}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void updateRequestStatus(request.id, "fulfilled")}>Mark fulfilled</Button>
                <Button size="sm" variant="outline" onClick={() => void updateRequestStatus(request.id, "cancelled")}>Cancel</Button>
              </div>
            </div>
          ))}
        </DashboardCard>

        <DashboardCard title="Bill payments" description="Create and track bill payment actions.">
          <div className="grid gap-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Biller name</span>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Biller name"
                value={billForm.billerName}
                onChange={(event) => setBillForm((value) => ({ ...value, billerName: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Amount</span>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Amount"
                type="number"
                value={billForm.amount}
                onChange={(event) => setBillForm((value) => ({ ...value, amount: event.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Due date</span>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                type="date"
                value={billForm.dueDate}
                onChange={(event) => setBillForm((value) => ({ ...value, dueDate: event.target.value }))}
              />
            </label>
            <Button size="sm" onClick={() => void createBillPaymentAction()} className="focus-visible:ring-2 focus-visible:ring-primary">
              Add bill payment
            </Button>
          </div>

          {bills.length === 0 ? <EmptyState title="No bill payments" description="Schedule bills to keep recurring payouts and settlements on track." /> : null}

          {bills.map((bill) => (
            <div key={bill.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{bill.billerName}</p>
                <Badge variant="outline" className="capitalize">{bill.status}</Badge>
              </div>
              <p className="text-sm">{formatCurrency(bill.amount)}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void updateBillStatus(bill.id, "paid")}>Mark paid</Button>
                <Button size="sm" variant="outline" onClick={() => void updateBillStatus(bill.id, "failed")}>Mark failed</Button>
              </div>
            </div>
          ))}
        </DashboardCard>
      </section>

      <PaymentVisualQAChecklist />

      {mutationError ? <p className="text-sm text-destructive">{mutationError}</p> : null}

      <BottomNav />
    </div>
  )
}
