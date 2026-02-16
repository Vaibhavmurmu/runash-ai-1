"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
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
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>RunAsh Pay Dashboard</CardTitle>
            <CardDescription>Instant checkout operations for RunAshChat + Stripe Link relay.</CardDescription>
          </div>
          <Button onClick={() => void refreshBalance()} variant="outline">Refresh balance</Button>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{summaryLoading ? "Loading..." : formatCurrency(balance)}</p>
          {summaryError ? <p className="text-sm text-destructive">{summaryError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link href="/send">Send</Link></Button>
            <Button asChild size="sm" variant="secondary"><Link href="/request">Request</Link></Button>
            <Button asChild size="sm" variant="secondary"><Link href="/scan">Scan</Link></Button>
            <Button asChild size="sm" variant="secondary"><Link href="/bills">Bills</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription>Server-backed search, filtering, and pagination.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="h-9 rounded-md border px-3 text-sm"
              placeholder="Search by id, method, provider"
              value={txSearch}
              onChange={(event) => {
                setTxPage(1)
                setTxSearch(event.target.value)
              }}
            />
            <select
              className="h-9 rounded-md border px-3 text-sm"
              value={txStatusFilter}
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
          </div>

          {txError ? <p className="text-sm text-destructive">{txError}</p> : null}
          <div className="space-y-2">
            {txLoading ? (
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-medium">{tx.id}</p>
                    <p className="text-xs text-muted-foreground">{tx.paymentMethod} · {tx.provider}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(tx.amount, tx.currency)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge variant={txStatusBadge[tx.status]}>{tx.status}</Badge>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={txPage <= 1} onClick={() => setTxPage((value) => value - 1)}>
              Previous
            </Button>
            <p className="text-xs text-muted-foreground">Page {txPage} / {txTotalPages}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={txPage >= txTotalPages}
              onClick={() => setTxPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment requests</CardTitle>
            <CardDescription>Create/update request actions with optimistic UI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <input className="h-9 rounded-md border px-3 text-sm" placeholder="Payer name" value={requestForm.payerName} onChange={(event) => setRequestForm((value) => ({ ...value, payerName: event.target.value }))} />
              <input className="h-9 rounded-md border px-3 text-sm" placeholder="Amount" type="number" value={requestForm.amount} onChange={(event) => setRequestForm((value) => ({ ...value, amount: event.target.value }))} />
              <input className="h-9 rounded-md border px-3 text-sm" placeholder="Note (optional)" value={requestForm.note} onChange={(event) => setRequestForm((value) => ({ ...value, note: event.target.value }))} />
              <Button size="sm" onClick={() => void createPaymentRequestAction()}>Create request</Button>
            </div>
            {requests.map((request) => (
              <div key={request.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{request.payerName}</p>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
                <p className="text-sm">{formatCurrency(request.amount)}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void updateRequestStatus(request.id, "fulfilled")}>Mark fulfilled</Button>
                  <Button size="sm" variant="outline" onClick={() => void updateRequestStatus(request.id, "cancelled")}>Cancel</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bill payments</CardTitle>
            <CardDescription>Create and track bill payment actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <input className="h-9 rounded-md border px-3 text-sm" placeholder="Biller name" value={billForm.billerName} onChange={(event) => setBillForm((value) => ({ ...value, billerName: event.target.value }))} />
              <input className="h-9 rounded-md border px-3 text-sm" placeholder="Amount" type="number" value={billForm.amount} onChange={(event) => setBillForm((value) => ({ ...value, amount: event.target.value }))} />
              <input className="h-9 rounded-md border px-3 text-sm" type="date" value={billForm.dueDate} onChange={(event) => setBillForm((value) => ({ ...value, dueDate: event.target.value }))} />
              <Button size="sm" onClick={() => void createBillPaymentAction()}>Add bill payment</Button>
            </div>
            {bills.map((bill) => (
              <div key={bill.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{bill.billerName}</p>
                  <Badge variant="outline">{bill.status}</Badge>
                </div>
                <p className="text-sm">{formatCurrency(bill.amount)}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void updateBillStatus(bill.id, "paid")}>Mark paid</Button>
                  <Button size="sm" variant="outline" onClick={() => void updateBillStatus(bill.id, "failed")}>Mark failed</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {mutationError ? <p className="text-sm text-destructive">{mutationError}</p> : null}
    </div>
  )
}
