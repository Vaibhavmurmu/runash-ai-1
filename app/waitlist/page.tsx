"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { waitlistJoinSchema } from "@/lib/validations/waitlist"

type WaitlistFormState = {
  email: string
  name: string
  useCase: string
}

type WaitlistFormField = keyof WaitlistFormState

type WaitlistFieldErrors = Partial<Record<WaitlistFormField, string>>

const initialState: WaitlistFormState = {
  email: "",
  name: "",
  useCase: "",
}

export default function WaitlistPage() {
  const [form, setForm] = useState<WaitlistFormState>(initialState)
  const [fieldErrors, setFieldErrors] = useState<WaitlistFieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function validateForm(nextForm: WaitlistFormState) {
    const validation = waitlistJoinSchema.safeParse(nextForm)

    if (validation.success) {
      setFieldErrors({})
      return true
    }

    const flattenedErrors = validation.error.flatten().fieldErrors
    const nextErrors: WaitlistFieldErrors = {
      email: flattenedErrors.email?.[0],
      name: flattenedErrors.name?.[0],
      useCase: flattenedErrors.useCase?.[0],
    }

    setFieldErrors(nextErrors)
    return false
  }

  function handleFieldChange(field: WaitlistFormField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrorMessage(null)

    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }))
    }

    if (fieldErrors[field]) {
      validateForm({ ...form, [field]: value })
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    const isValid = validateForm(form)
    if (!isValid) {
      setErrorMessage("Please fix the highlighted fields and try again.")
      return
    }

    setIsSubmitting(true)

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
        const apiFieldErrors = payload?.error?.details as Record<string, string[] | undefined> | undefined

        setFieldErrors((current) => ({
          ...current,
          email: apiFieldErrors?.email?.[0] ?? current.email,
          name: apiFieldErrors?.name?.[0] ?? current.name,
          useCase: apiFieldErrors?.useCase?.[0] ?? current.useCase,
        }))
        setErrorMessage(message)
        return
      }

      setSuccessMessage(payload?.data?.message ?? "You’re on the waitlist!")
      setForm(initialState)
      setFieldErrors({})
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
              Get early access updates for upcoming RunAsh features. Add your email and optional context so we can prioritize invites.
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
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  placeholder="you@company.com"
                />
                {fieldErrors.email ? <p className="text-sm text-red-600">{fieldErrors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => handleFieldChange("name", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  placeholder="Your name"
                />
                {fieldErrors.name ? <p className="text-sm text-red-600">{fieldErrors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="useCase">Use case (optional)</Label>
                <Textarea
                  id="useCase"
                  value={form.useCase}
                  onChange={(event) => handleFieldChange("useCase", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.useCase)}
                  placeholder="How are you planning to use RunAsh?"
                  rows={4}
                />
                {fieldErrors.useCase ? <p className="text-sm text-red-600">{fieldErrors.useCase}</p> : null}
              </div>

              {successMessage ? (
                <p role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {successMessage}
                </p>
              ) : null}

              {errorMessage ? (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-white">
                {isSubmitting ? "Joining..." : "Join waitlist"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Looking for the full product now?{" "}
              <Link href="/get-started" className="underline">
                Get started
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
