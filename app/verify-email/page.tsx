"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

type VerificationState = "verifying" | "success" | "error"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [state, setState] = useState<VerificationState>("verifying")
  const [error, setError] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState("")

  const verifyPath = useMemo(() => {
    if (!token) {
      return null
    }

    return `/api/auth/verify-email?token=${encodeURIComponent(token)}`
  }, [token])

  useEffect(() => {
    if (!verifyPath) {
      setState("error")
      setError("Invalid or missing verification token")
      return
    }

    let active = true

    const verify = async () => {
      try {
        const response = await fetch(verifyPath, {
          method: "GET",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          if (!active) {
            return
          }

          setError(typeof data?.message === "string" ? data.message : "Verification failed")
          setState("error")
          return
        }

        if (!active) {
          return
        }

        setState("success")

        setTimeout(() => {
          router.push("/login?emailVerified=1")
        }, 2000)
      } catch {
        if (!active) {
          return
        }

        setError("An error occurred. Please try again.")
        setState("error")
      }
    }

    verify()

    return () => {
      active = false
    }
  }, [router, verifyPath])

  const handleResend = async () => {
    if (!email) {
      return
    }

    setResendLoading(true)
    setResendMessage("")

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => ({}))
      setResendMessage(
        response.ok
          ? typeof data?.message === "string"
            ? data.message
            : "If an account with that email exists, we've sent a verification link."
          : "Unable to resend verification email right now.",
      )
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Complete verification to unlock full account access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "verifying" ? (
            <Alert>
              <AlertDescription>Verifying your email now. Please wait...</AlertDescription>
            </Alert>
          ) : null}

          {state === "success" ? (
            <Alert className="bg-green-50 border-green-200 text-green-900">
              <AlertDescription>Email verified successfully! Redirecting to login...</AlertDescription>
            </Alert>
          ) : null}

          {state === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{error || "Verification failed"}</AlertDescription>
            </Alert>
          ) : null}

          {resendMessage ? (
            <Alert>
              <AlertDescription>{resendMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">Continue to Login</Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleResend}
              disabled={resendLoading || !email}
            >
              {resendLoading ? "Sending..." : "Resend Verification Email"}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            No full access until verification is complete. Check spam/promotions if the email is delayed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
