"use client"

import { useEffect, useState } from "react"
import { Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ReferralInvite = {
  id: string
  inviteeEmail: string
  status: string
  sentAt: string
}

type ReferralStatus = {
  totalInvites: number
  totalConversions: number
  invites: ReferralInvite[]
}

export function ReferPageClient() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<ReferralStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadStatus = async () => {
    const response = await fetch("/api/referrals")
    const payload = await response.json()
    if (response.ok) {
      setStatus(payload.data)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const submitInvite = async () => {
    setMessage(null)

    const response = await fetch("/api/referrals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload?.error?.message ?? "Failed to send invite")
      return
    }

    setMessage("Referral invite sent.")
    setEmail("")
    await loadStatus()
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Refer &amp; Earn</h1>
        <p className="text-sm text-muted-foreground">Invite users and track conversion milestones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" />
            Invite a contact
          </CardTitle>
          <CardDescription>Duplicate invites are blocked automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="invite-email">Invitee email</Label>
          <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button onClick={submitInvite} disabled={!email.trim()}>Send invite</Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total invites</CardTitle>
          </CardHeader>
          <CardContent>{status?.totalInvites ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total conversions</CardTitle>
          </CardHeader>
          <CardContent>{status?.totalConversions ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent invites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(status?.invites ?? []).slice(0, 8).map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded border p-2">
              <span>{invite.inviteeEmail}</span>
              <span className="text-muted-foreground">{invite.status}</span>
            </div>
          ))}
          {!status?.invites?.length ? <p className="text-muted-foreground">No invites yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
