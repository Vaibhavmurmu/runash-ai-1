"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, ArrowRight, AlertCircle, CheckCircle, ExternalLink } from "lucide-react"
import { signIn } from "next-auth/react"

interface SSOLoginProps {
  onEmailCheck?: (email: string, hasSSO: boolean) => void
}

export function SSOLogin({ onEmailCheck }: SSOLoginProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [ssoInfo, setSSOInfo] = useState<{
    hasSSO: boolean
    organizationName?: string
    providerType?: string
    ssoUrl?: string
    redirectUrl?: string
  } | null>(null)

  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setError("")
    setSSOInfo(null)

    try {
      const response = await fetch("/api/auth/sso/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSSOInfo(data)
        onEmailCheck?.(email, data.hasSSO)

        if (data.hasSSO && data.redirectUrl) {
          // Auto-redirect to SSO after a short delay
          setTimeout(() => {
            window.location.href = data.redirectUrl
          }, 2000)
        }
      } else {
        setError(data.error || "Failed to check SSO configuration")
      }
    } catch (error) {
      setError("Failed to check SSO configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSSOLogin = (provider: string) => {
    signIn(provider, { callbackUrl: "/dashboard/chat" })
  }

  if (ssoInfo?.hasSSO) {
    return (
      <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            SSO Login Required
          </CardTitle>
          <CardDescription className="text-gray-600">Your organization uses Single Sign-On</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="text-sm text-green-700">
              <p className="font-medium">{ssoInfo.organizationName}</p>
              <p>SSO is configured for your domain</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">You'll be redirected to your organization's sign-in page</p>

              {ssoInfo.redirectUrl && (
                <Button
                  onClick={() => (window.location.href = ssoInfo.redirectUrl!)}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Continue with SSO
                  </div>
                </Button>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">Redirecting automatically in a few seconds...</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleSSOLogin("google")}
                className="h-10 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSSOLogin("azure-ad")}
                className="h-10 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4z" />
                  <path d="M24 11.4H12.6V0H24v11.4z" fill="#00BCF2" />
                </svg>
                Microsoft
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setSSOInfo(null)
              setEmail("")
            }}
            className="w-full text-gray-600 hover:text-gray-700"
          >
            Try Different Email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
          Enterprise Sign In
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enter your work email to check for SSO configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailCheck} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Work Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white/50 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking SSO...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Continue
              </div>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="text-sm font-medium text-orange-800 mb-2">Enterprise Features:</h4>
          <ul className="text-xs text-orange-700 space-y-1">
            <li>• Single Sign-On (SSO) with SAML and OIDC</li>
            <li>• Automatic user provisioning</li>
            <li>• Domain-based authentication</li>
            <li>• Enhanced security and compliance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
