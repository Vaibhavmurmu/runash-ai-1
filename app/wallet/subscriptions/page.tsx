"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Subscription = { id: string; plan: string; status: 'active' | 'paused' | 'canceled'; nextBillingDate: string; amount: number; currency: string }

export default function WalletSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])

  const load = async () => {
    const response = await fetch('/api/wallet/subscriptions?userId=demo-user', { cache: 'no-store' })
    const payload = await response.json()
    if (payload.success) setSubs(payload.data)
  }

  useEffect(() => {
    void load()
  }, [])

  const updateStatus = async (subscriptionId: string, status: Subscription['status']) => {
    await fetch('/api/wallet/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user', subscriptionId, status }),
    })
    await load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/wallet"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-semibold">Subscription Management</h1>
        </div>

        {subs.map((sub) => (
          <Card key={sub.id}>
            <CardHeader><CardTitle>{sub.plan}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p>{sub.currency} {sub.amount}/mo</p>
                <Badge variant={sub.status === 'active' ? 'secondary' : sub.status === 'paused' ? 'outline' : 'destructive'}>{sub.status}</Badge>
              </div>
              <p className="text-sm text-slate-600">Next billing: {new Date(sub.nextBillingDate).toLocaleDateString()}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(sub.id, 'active')}>Activate</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(sub.id, 'paused')}>Pause</Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus(sub.id, 'canceled')}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
