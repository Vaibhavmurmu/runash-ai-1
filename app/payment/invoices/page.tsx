"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Invoice = {
  id: string
  status: string
  currency: string
  amount_due: number
  amount_paid: number
  due_date: string | null
  created_at: string
  customer_name?: string | null
}

export default function PaymentInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/v1/billing/invoices?limit=50", { cache: "no-store" })
      const payload = await response.json()
      setInvoices(payload?.data?.invoices ?? [])
      setLoading(false)
    }

    void load()
  }, [])

  const totals = useMemo(() => {
    const due = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_due ?? 0), 0)
    const paid = invoices.reduce((sum, invoice) => sum + Number(invoice.amount_paid ?? 0), 0)
    return { due, paid }
  }, [invoices])

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">List, create, and track invoice payments.</p>
        </div>
        <Button asChild>
          <Link href="/payment/invoices/create">Create invoice</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Total due</CardTitle></CardHeader>
          <CardContent>{totals.due}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total paid</CardTitle></CardHeader>
          <CardContent>{totals.paid}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {loading ? <p className="text-sm text-muted-foreground">Loading invoices…</p> : null}
          {!loading && invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices found.</p> : null}
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
              <div>
                <p className="font-medium">Invoice #{invoice.id}</p>
                <p className="text-xs text-muted-foreground">{invoice.customer_name ?? "Customer"} • {new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p>{invoice.currency} {invoice.amount_due}</p>
                <Badge variant="outline">{invoice.status}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild><Link href={`/payment/invoices/${invoice.id}`}>Detail</Link></Button>
                <Button variant="outline" size="sm" asChild><Link href={`/payment/invoices/${invoice.id}/payment-status`}>Payment status</Link></Button>
                <Button variant="outline" size="sm" asChild><Link href={`/payment/invoices/${invoice.id}/receipt`}>Receipt</Link></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
