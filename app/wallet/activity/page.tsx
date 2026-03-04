"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Activity = { id: string; type: string; description: string; amount?: number; currency?: string; createdAt: string }
type Transaction = {
  id: string
  description: string
  amount: number
  currency: string
  status: "succeeded" | "failed"
  reconciliationRef: string
  settlementDate: string
  createdAt: string
}

export default function WalletActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)

  const load = async () => {
    const activityResponse = await fetch(`/api/wallet/activity?userId=demo-user&search=${encodeURIComponent(search)}&limit=10&offset=${offset}`, { cache: "no-store" })
    const activityPayload = await activityResponse.json()
    if (activityPayload.success) setActivity(activityPayload.data)

    const transactionsResponse = await fetch(`/api/wallet/transactions?userId=demo-user&search=${encodeURIComponent(search)}&limit=10&offset=${offset}`, { cache: "no-store" })
    const transactionsPayload = await transactionsResponse.json()
    if (transactionsPayload.success) setTransactions(transactionsPayload.data)
  }

  useEffect(() => {
    void load()
  }, [offset, search])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/wallet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Wallet Activity & Transactions</h1>
        </div>

        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Search activity / transactions</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description or reconciliation ref" />
            </div>
            <div className="flex items-end gap-2">
              <a href={`/api/wallet/activity?userId=demo-user&search=${encodeURIComponent(search)}&format=csv`}>
                <Button variant="outline">Download activity CSV</Button>
              </a>
              <a href={`/api/wallet/transactions?userId=demo-user&search=${encodeURIComponent(search)}&format=csv`}>
                <Button variant="outline">Download transactions CSV</Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-600">No activity yet.</p>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="rounded border p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>
                  <div className="text-right">
                    {item.amount ? (
                      <p className="font-medium">
                        {item.currency || "INR"} {item.amount}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <Clock3 className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions (reconciliation ready)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-600">No transactions yet.</p>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="rounded border p-3 space-y-1">
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-xs text-slate-600">
                    {transaction.currency} {transaction.amount} • {transaction.status}
                  </p>
                  <p className="text-xs text-slate-600">Reconciliation ref: {transaction.reconciliationRef}</p>
                  <p className="text-xs text-slate-600">Settlement: {new Date(transaction.settlementDate).toLocaleDateString()}</p>
                </div>
              ))
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset((prev) => Math.max(prev - 10, 0))}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setOffset((prev) => prev + 10)}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
