"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageSquare, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type WidgetPayload = {
  feedback: {
    total: number
    latest: { score: number; status: string; createdAt: string } | null
  }
  referrals: {
    totalInvites: number
    totalConversions: number
  }
}

export function ReferralFeedbackWidgets() {
  const [data, setData] = useState<WidgetPayload | null>(null)

  useEffect(() => {
    let active = true
    void fetch("/api/dashboard/widgets/referral-feedback")
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload?.data) return
        setData(payload.data as WidgetPayload)
      })
      .catch(() => null)

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Referral status
          </CardTitle>
          <CardDescription>Track invites and conversion milestones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Invites sent: {data?.referrals.totalInvites ?? 0}</p>
          <p>Conversions: {data?.referrals.totalConversions ?? 0}</p>
          <Link className="text-primary underline" href="/dashboard/refer">Manage referrals</Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Feedback status
          </CardTitle>
          <CardDescription>Recent feedback submissions and triage state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Entries submitted: {data?.feedback.total ?? 0}</p>
          <p>Latest score: {data?.feedback.latest?.score ?? "n/a"}</p>
          <p>Latest status: {data?.feedback.latest?.status ?? "n/a"}</p>
          <Link className="text-primary underline" href="/dashboard/feedback">Open feedback</Link>
        </CardContent>
      </Card>
    </div>
  )
}
