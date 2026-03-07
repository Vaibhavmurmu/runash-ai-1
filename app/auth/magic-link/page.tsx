"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MagicLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Invalid magic link - no token provided")
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/magic-link/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (response.ok) {
          setStatus("success")
          setMessage("Successfully signed in! Redirecting...")

          // Redirect to dashboard or home page after 2 seconds
          setTimeout(() => {
            router.push("/dashboard/chat")
          }, 2000)
        } else {
          setStatus("error")
          setMessage(data.error || "Failed to verify magic link")
        }
      } catch (error) {
        setStatus("error")
        setMessage("An unexpected error occurred")
      }
    }

    verifyToken()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
        <CardContent className="pt-8 pb-6">
          <div className="text-center space-y-6">
            {status === "loading" && (
              <>
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Magic Link</h2>
                  <p className="text-gray-600 text-sm">Please wait while we sign you in...</p>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome Back!</h2>
                  <p className="text-gray-600 text-sm">{message}</p>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Failed</h2>
                  <p className="text-gray-600 text-sm mb-4">{message}</p>
                  <Button
                    onClick={() => router.push("/login")}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
