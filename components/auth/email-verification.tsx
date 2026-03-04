"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CardAlert } from "@/components/ui/card-alert"
import Link from "next/link"

export function EmailVerification() {
  const [isLoading, setIsLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [isResending, setIsResending] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing verification token")
      setIsLoading(false)
      return
    }

    verifyEmail()
  }, [token])

  const verifyEmail = async () => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Failed to verify email")
        return
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      setError("An error occurred during verification")
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerification = async () => {
    setIsResending(true)

    try {
      // This would need the user's email - in a real app, you might store this in localStorage
      // or require the user to enter their email again
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "user@example.com" }), // This should be dynamic
      })

      if (response.ok) {
        setError("")
        // Show success message
      }
    } catch (error) {
      setError("Failed to resend verification email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="relative overflow-hidden border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            success
              ? "from-green-500/10 via-transparent to-green-600/5"
              : error
                ? "from-red-500/10 via-transparent to-red-600/5"
                : "from-orange-500/10 via-transparent to-orange-600/5"
          }`}
        />
        <CardHeader className="relative space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {isLoading ? "Verifying Email..." : success ? "Email Verified!" : "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-base">
            {isLoading
              ? "Please wait while we verify your email address"
              : success
                ? "Your email has been successfully verified"
                : "There was a problem verifying your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-center space-y-4">
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                isLoading
                  ? "bg-gradient-to-r from-orange-500 to-orange-600"
                  : success
                    ? "bg-gradient-to-r from-green-500 to-green-600"
                    : "bg-gradient-to-r from-red-500 to-red-600"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : success ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <XCircle className="w-8 h-8 text-white" />
              )}
            </div>

            {error ? <CardAlert severity="danger" title="Verification failed" description={error} /> : null}

            {success ? (
              <CardAlert
                severity="success"
                title="Account activated"
                description="Your account is now active! You can sign in and start using all features."
              />
            ) : null}

            <div className="space-y-3">
              {success ? (
                <Button asChild className="w-full">
                  <Link href="/login">Continue to Login</Link>
                </Button>
              ) : error ? (
                <div className="space-y-2">
                  <Button
                    onClick={resendVerification}
                    disabled={isResending}
                    className="w-full bg-transparent"
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                  <Button asChild variant="link" className="w-full">
                    <Link href="/login">Back to Login</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
