"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const emptyItem = { description: "", quantity: 1, unitAmount: "" }

export default function CreateInvoicePage() {
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [dueDate, setDueDate] = useState("")
  const [taxAmount, setTaxAmount] = useState("0")
  const [lineItems, setLineItems] = useState([{ ...emptyItem }])
  const [error, setError] = useState<string | null>(null)
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null)

  const addLineItem = () => setLineItems((current) => [...current, { ...emptyItem }])

  const save = async () => {
    setError(null)
    if (!customerName.trim() || !customerEmail.trim() || !dueDate || !currency.trim()) {
      setError("Customer, due date, and currency are required")
      return
    }

    if (lineItems.some((item) => !item.description.trim() || Number(item.quantity) <= 0 || Number(item.unitAmount) < 0)) {
      setError("Each line item requires description, positive quantity, and unit amount")
      return
    }

    const response = await fetch("/api/v1/billing/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: {
          name: customerName,
          email: customerEmail,
        },
        dueDate: new Date(dueDate).toISOString(),
        currency,
        tax: {
          amount: Number(taxAmount) || 0,
        },
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitAmount: Number(item.unitAmount),
        })),
      }),
    })

    const payload = await response.json()
    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? "Failed to create invoice")
      return
    }

    setCreatedInvoiceId(String(payload.data.invoiceId))
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Create invoice</h1>
        <Button asChild variant="outline"><Link href="/payment/invoices">Back to invoices</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Invoice details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Customer name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          <Input placeholder="Customer email" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
          <Input placeholder="Currency (e.g. USD)" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} />
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Input placeholder="Tax amount" type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} />

          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-3">
              <Input placeholder="Description" value={item.description} onChange={(event) => setLineItems((current) => current.map((line, idx) => idx === index ? { ...line, description: event.target.value } : line))} />
              <Input placeholder="Quantity" type="number" min="1" value={item.quantity} onChange={(event) => setLineItems((current) => current.map((line, idx) => idx === index ? { ...line, quantity: Number(event.target.value) } : line))} />
              <Input placeholder="Unit amount" type="number" min="0" step="0.01" value={item.unitAmount} onChange={(event) => setLineItems((current) => current.map((line, idx) => idx === index ? { ...line, unitAmount: event.target.value } : line))} />
            </div>
          ))}

          <Button variant="outline" onClick={addLineItem}>Add line item</Button>
          <Button onClick={save}>Create invoice</Button>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {createdInvoiceId ? <p className="text-sm text-green-600">Created invoice #{createdInvoiceId}. <Link className="underline" href={`/payment/invoices/${createdInvoiceId}`}>Open detail</Link></p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
