"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, LifeBuoy, RefreshCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const errorMap: Record<string, { title: string; description: string; ctaHref: string; ctaLabel: string }> = {
  CredentialsSignin: {
    title: "Sign-in failed",
    description: "We could not verify your credentials. Please check your email/password and try again.",
    ctaHref: "/login",
    ctaLabel: "Try sign-in again",
  },
  AccessDenied: {
    title: "Access denied",
    description: "Your account does not have access to this resource.",
    ctaHref: "/unauthorized",
    ctaLabel: "View access details",
  },
  default: {
    title: "Authentication error",
    description: "Something went wrong during authentication. You can retry or contact support.",
    ctaHref: "/login",
    ctaLabel: "Back to login",
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const code = searchParams.get("error") ?? "default"
  const mode = searchParams.get("mode")
  const token = searchParams.get("token")
  const [message, setMessage] = useState<string | null>(null)
  const config = errorMap[code] ?? errorMap.default

  useEffect(() => {
    async function confirmEmailChange() {
      if (mode !== "confirm-email-change" || !token) return
      const response = await fetch("/api/auth/account/change-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = (await response.json()) as { message?: string }
      setMessage(data.message ?? (response.ok ? "Email updated." : "Unable to confirm email change."))
    }

    void confirmEmailChange()
  }, [mode, token])

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{message ?? config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href={config.ctaHref}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {config.ctaLabel}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/support">
              <LifeBuoy className="mr-2 h-4 w-4" />
              Contact support
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
