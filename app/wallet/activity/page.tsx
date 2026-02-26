"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Activity = { id: string; type: string; description: string; amount?: number; currency?: string; createdAt: string }

export default function WalletActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([])

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/wallet/activity?userId=demo-user', { cache: 'no-store' })
      const payload = await response.json()
      if (payload.success) setActivity(payload.data)
    })()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/wallet"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-semibold">Wallet Activity</h1>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? <p className="text-sm text-slate-600">No activity yet.</p> : activity.map((item) => (
              <div key={item.id} className="rounded border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-slate-500">{item.type}</p>
                </div>
                <div className="text-right">
                  {item.amount ? <p className="font-medium">{item.currency || 'INR'} {item.amount}</p> : null}
                  <p className="text-xs text-slate-500 flex items-center gap-1 justify-end"><Clock3 className="w-3 h-3" />{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
