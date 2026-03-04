"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InvoiceReceiptPage() {
  const params = useParams<{ id: string }>()
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/v1/billing/invoices/${params.id}/receipt?redirect=false`, { cache: "no-store" })
      const payload = await response.json()
      setDownloadUrl(payload?.data?.downloadUrl ?? null)
    }
    void load()
  }, [params.id])

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">Invoice receipt</h1>
      <Card>
        <CardHeader><CardTitle>Receipt and download</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Invoice #{params.id}</p>
          {downloadUrl ? <a className="text-sm underline" href={downloadUrl} target="_blank" rel="noreferrer">Open receipt/download</a> : <p className="text-sm text-muted-foreground">Receipt not available yet.</p>}
          <Button variant="outline" asChild><Link href={`/payment/invoices/${params.id}`}>Back to detail</Link></Button>
        </CardContent>
      </Card>
    </div>
  )
}
