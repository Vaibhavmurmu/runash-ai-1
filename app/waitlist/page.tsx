"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type WaitlistFormState = {
  email: string
  name: string
  company: string
  useCase: string
}

const initialState: WaitlistFormState = {
  email: "",
  name: "",
  company: "",
  useCase: "",
}

export default function WaitlistPage() {
  const [form, setForm] = useState<WaitlistFormState>(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      })

      const payload = await response.json()

      if (!response.ok) {
        const fallback = "Unable to join the waitlist. Please try again."
        const message = payload?.error?.message || payload?.message || fallback
        setErrorMessage(message)
        return
      }

      setSuccessMessage(payload?.data?.message ?? "You’re on the waitlist!")
      setForm(initialState)
    } catch {
      setErrorMessage("Unable to join the waitlist. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900 py-16 px-4">
      <div className="mx-auto max-w-2xl">
        <Card className="border-orange-200/60 dark:border-orange-900/30">
          <CardHeader>
            <CardTitle className="text-3xl">Join the RunAsh Waitlist</CardTitle>
            <CardDescription>
              Get early access updates for upcoming RunAsh features. We only need your email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="you@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="company"
                  value={form.company}
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                  placeholder="Company or team"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="useCase">Use case (optional)</Label>
                <Textarea
                  id="useCase"
                  value={form.useCase}
                  onChange={(event) => setForm((current) => ({ ...current, useCase: event.target.value }))}
                  placeholder="How are you planning to use RunAsh?"
                  rows={4}
                />
              </div>

              {successMessage ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>
              ) : null}

              {errorMessage ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
              ) : null}

              <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
                {isSubmitting ? "Joining..." : "Join waitlist"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Looking for the full product now? <Link href="/get-started" className="underline">Get started</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
