"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InvoicePaymentStatusPage() {
  const params = useParams<{ id: string }>()
  const [statusPayload, setStatusPayload] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/v1/billing/invoices/${params.id}/payment-status`, { cache: "no-store" })
      const payload = await response.json()
      setStatusPayload(payload?.data ?? null)
    }
    void load()
  }, [params.id])

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">Invoice payment status</h1>
      <Card>
        <CardHeader><CardTitle>Invoice #{params.id}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!statusPayload ? <p className="text-muted-foreground">Loading…</p> : null}
          {statusPayload ? (
            <>
              <p>Status: <Badge variant="outline">{statusPayload.status}</Badge></p>
              <p>Amount due: {statusPayload.currency} {statusPayload.amountDue}</p>
              <p>Amount paid: {statusPayload.currency} {statusPayload.amountPaid}</p>
              <p>Attempts: {(statusPayload.paymentAttempts ?? []).length}</p>
              {(statusPayload.paymentAttempts ?? []).map((attempt: Record<string, any>) => (
                <div key={attempt.id} className="rounded border p-2">
                  {attempt.status} • {attempt.provider} • {attempt.provider_reference ?? "n/a"}
                </div>
              ))}
            </>
          ) : null}
          <Button variant="outline" asChild><Link href={`/payment/invoices/${params.id}`}>Back to detail</Link></Button>
        </CardContent>
      </Card>
    </div>
  )
}
