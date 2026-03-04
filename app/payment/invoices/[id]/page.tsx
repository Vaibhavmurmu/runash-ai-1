"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type InvoiceDetail = Record<string, any>

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/v1/billing/invoices/${params.id}`, { cache: "no-store" })
      const payload = await response.json()
      setInvoice(payload?.data?.invoice ?? null)
    }
    void load()
  }, [params.id])

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Invoice #{params.id}</h1>
        <Button asChild variant="outline"><Link href="/payment/invoices">Back</Link></Button>
      </div>
      {!invoice ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {invoice ? (
        <Card>
          <CardHeader><CardTitle>Invoice detail</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Status: <Badge variant="outline">{invoice.status}</Badge></p>
            <p>Customer: {invoice.customer_name ?? "-"} ({invoice.customer_email ?? "-"})</p>
            <p>Amount due: {invoice.currency} {invoice.amount_due}</p>
            <p>Amount paid: {invoice.currency} {invoice.amount_paid}</p>
            <p>Due date: {invoice.due_date ? new Date(invoice.due_date).toLocaleString() : "-"}</p>
            <div>
              <p className="font-medium">Line items</p>
              <ul className="list-disc pl-5">
                {(invoice.line_items ?? []).map((item: Record<string, any>) => (
                  <li key={item.id}>{item.description} — {item.quantity} × {item.unit_amount}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild><Link href={`/payment/invoices/${params.id}/payment-status`}>Payment status</Link></Button>
              <Button size="sm" variant="outline" asChild><Link href={`/payment/invoices/${params.id}/receipt`}>Receipt / Download</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
