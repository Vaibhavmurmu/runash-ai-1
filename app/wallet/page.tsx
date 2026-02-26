"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Smartphone, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type WalletCard = {
  id: string
  holderName: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

type LinkSession = { id: string; email: string; maskedPhone: string }

const demoUserId = "demo-user"

export default function WalletPage() {
  const [cards, setCards] = useState<WalletCard[]>([])
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [session, setSession] = useState<LinkSession | null>(null)
  const [autofill, setAutofill] = useState<{ email: string; paymentMethod: string; billingAddress: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    holderName: "",
    cardNumber: "",
    expMonth: "",
    expYear: "",
    billingAddress: "",
  })

  const defaultCard = useMemo(() => cards.find((c) => c.isDefault) || null, [cards])

  const loadCards = async () => {
    const response = await fetch(`/api/wallet/cards?userId=${demoUserId}`, { cache: "no-store" })
    const payload = await response.json()
    if (payload?.success) {
      setCards(payload.data)
    }
  }

  useEffect(() => {
    void loadCards()
  }, [])

  const saveCard = async () => {
    setSaving(true)
    try {
      await fetch("/api/wallet/link/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: demoUserId,
          email: email || "user@runash.in",
          holderName: form.holderName,
          cardNumber: form.cardNumber,
          expMonth: Number(form.expMonth),
          expYear: Number(form.expYear),
          billingAddress: form.billingAddress,
          brand: "visa",
        }),
      })
      await loadCards()
      setForm({ holderName: "", cardNumber: "", expMonth: "", expYear: "", billingAddress: "" })
    } finally {
      setSaving(false)
    }
  }

  const requestCode = async () => {
    const response = await fetch("/api/wallet/link/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: demoUserId, email }),
    })
    const payload = await response.json()
    if (payload.success) {
      setSession(payload.data)
    }
  }

  const verifyCode = async () => {
    if (!session) return
    const response = await fetch("/api/wallet/link/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, code: otp }),
    })
    const payload = await response.json()
    if (payload.success) {
      setAutofill(payload.data.autofill)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white/80 border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-full"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">RunAsh Wallet + Link</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/wallet/activity"><Button variant="outline">Activity</Button></Link>
            <Link href="/wallet/subscriptions"><Button variant="outline">Subscriptions</Button></Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Save payment info</CardTitle>
            <CardDescription>Customers can securely save payment methods for Link auto-fill at checkout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@runash.in" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Card holder</Label><Input value={form.holderName} onChange={(e) => setForm((p) => ({ ...p, holderName: e.target.value }))} placeholder="Jane Smith" /></div>
              <div><Label>Card number</Label><Input value={form.cardNumber} onChange={(e) => setForm((p) => ({ ...p, cardNumber: e.target.value }))} placeholder="4242 4242 4242 4242" /></div>
              <div><Label>Exp month</Label><Input value={form.expMonth} onChange={(e) => setForm((p) => ({ ...p, expMonth: e.target.value }))} placeholder="12" /></div>
              <div><Label>Exp year</Label><Input value={form.expYear} onChange={(e) => setForm((p) => ({ ...p, expYear: e.target.value }))} placeholder="2028" /></div>
            </div>
            <div><Label>Billing address</Label><Input value={form.billingAddress} onChange={(e) => setForm((p) => ({ ...p, billingAddress: e.target.value }))} placeholder="Bokaro, Jharkhand" /></div>
            <Button className="w-full" onClick={saveCard} disabled={saving || !form.cardNumber || !form.holderName || !email}>{saving ? "Saving..." : "Save payment info"}</Button>
            {defaultCard ? <p className="text-sm text-slate-600">Default: {defaultCard.brand.toUpperCase()} •••• {defaultCard.last4}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Account verification</CardTitle>
            <CardDescription>Send one-time code via SMS on new devices/sites for Link verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onClick={requestCode} disabled={!email}>Send one-time code</Button>
            {session ? <Badge>Code sent to {session.maskedPhone}</Badge> : null}
            <div>
              <Label>Enter verification code</Label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} />
            </div>
            <Button className="w-full" onClick={verifyCode} disabled={!session || otp.length < 6}>Verify and continue</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5" /> Check out faster with Link</CardTitle>
            <CardDescription>When users enter email, Link auto-fills saved payment details across supported sites and RunAshChat.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">1. Save payment info</h3>
              <p className="text-sm text-slate-600">Users opt-in once at checkout and encrypted payment metadata is saved.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">2. Verify identity</h3>
              <p className="text-sm text-slate-600">On new devices, OTP verification protects account access before auto-fill.</p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">3. Auto-fill checkout</h3>
              <p className="text-sm text-slate-600">Saved email and method are auto-filled for instant secure checkout.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5" /> Link autofill preview</CardTitle>
          </CardHeader>
          <CardContent>
            {autofill ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium text-emerald-900">Checkout ready</p>
                  <p className="text-sm text-emerald-800">Email: {autofill.email}</p>
                  <p className="text-sm text-emerald-800">Method: {autofill.paymentMethod}</p>
                  <p className="text-sm text-emerald-800">Billing: {autofill.billingAddress}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Verify account to preview auto-filled checkout details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
