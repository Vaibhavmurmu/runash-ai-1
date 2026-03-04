"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type TimelineEvent = {
  id: string
  eventType: "plan_changed" | "paused" | "canceled" | "reactivated"
  reason?: string
  toPlan?: string
  createdAt: string
}

type Subscription = {
  id: string
  plan: string
  status: "active" | "paused" | "canceled"
  nextBillingDate: string
  amount: number
  currency: string
  timeline: TimelineEvent[]
}

export default function WalletSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [reason, setReason] = useState("")
  const [plan, setPlan] = useState("RunAsh Pro")
  const [search, setSearch] = useState("")

  const load = async () => {
    const response = await fetch(`/api/wallet/subscriptions?userId=demo-user&search=${encodeURIComponent(search)}`, { cache: "no-store" })
    const payload = await response.json()
    if (payload.success) setSubs(payload.data)
  }

  useEffect(() => {
    void load()
  }, [search])

  const patchSubscription = async (
    subscriptionId: string,
    input: {
      eventType: TimelineEvent["eventType"]
      status?: Subscription["status"]
      plan?: string
    },
  ) => {
    await fetch("/api/wallet/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "demo-user", subscriptionId, reason, ...input }),
    })
    await load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/wallet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Subscription Management</h1>
        </div>

        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Reason capture (for pause/cancel/reactivate)</Label>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Customer requested due to budget constraints" />
            </div>
            <div>
              <Label>Change plan to</Label>
              <Input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="RunAsh Premium" />
            </div>
            <div className="md:col-span-3">
              <Label>Search subscriptions</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by plan name" />
            </div>
          </CardContent>
        </Card>

        {subs.map((sub) => (
          <Card key={sub.id}>
            <CardHeader>
              <CardTitle>{sub.plan}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p>
                  {sub.currency} {sub.amount}/mo
                </p>
                <Badge variant={sub.status === "active" ? "secondary" : sub.status === "paused" ? "outline" : "destructive"}>{sub.status}</Badge>
              </div>
              <p className="text-sm text-slate-600">Next billing: {new Date(sub.nextBillingDate).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => patchSubscription(sub.id, { eventType: "plan_changed", plan })}>
                  Change plan
                </Button>
                <Button size="sm" variant="outline" onClick={() => patchSubscription(sub.id, { eventType: "reactivated", status: "active" })}>
                  Reactivate
                </Button>
                <Button size="sm" variant="outline" onClick={() => patchSubscription(sub.id, { eventType: "paused", status: "paused" })}>
                  Pause
                </Button>
                <Button size="sm" variant="destructive" onClick={() => patchSubscription(sub.id, { eventType: "canceled", status: "canceled" })}>
                  Cancel
                </Button>
              </div>
              <div className="rounded border p-3 space-y-2">
                <p className="text-sm font-medium">Timeline events</p>
                {sub.timeline.length === 0 ? (
                  <p className="text-xs text-slate-500">No timeline events yet.</p>
                ) : (
                  sub.timeline.map((event) => (
                    <div key={event.id} className="text-xs text-slate-600 border-b last:border-b-0 pb-2 last:pb-0">
                      <p className="font-medium text-slate-700">{event.eventType.replaceAll("_", " ")}</p>
                      {event.toPlan ? <p>Plan: {event.toPlan}</p> : null}
                      {event.reason ? <p>Reason: {event.reason}</p> : null}
                      <p>{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
