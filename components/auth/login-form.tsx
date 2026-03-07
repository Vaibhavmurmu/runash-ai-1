"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { getAuthSession } from "@/lib/auth/access-client"
import { Eye, EyeOff, Github, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CardAlert } from "@/components/ui/card-alert"
import { CardAlertDialog } from "@/components/ui/card-alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { PhoneOtpVerification } from "@/components/auth/phone-otp-verification"
import { GoogleOneTap } from "@/components/auth/google-one-tap"
import { formatLoginMethodLabel, getLastLoginMethod, setLastLoginMethod, type LoginMethod } from "@/lib/auth/last-login-method"

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [pendingOAuthProvider, setPendingOAuthProvider] = useState<"github" | "google" | null>(null)
  const [lastLoginMethod, setLastLoginMethodState] = useState<LoginMethod>("unknown")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  })
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setLastLoginMethodState(getLastLoginMethod())
  }, [])


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      setLastLoginMethod("password")
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        return
      }

      // Get updated session
      const session = await getAuthSession()

      toast({
        title: "Welcome back!",
        description: `Signed in as ${session?.user?.name || formData.email}`,
      })

      router.push("/dashboard/chat")
      router.refresh()
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    try {
      setLastLoginMethod(provider === "google" || provider === "github" ? provider : "unknown")
      await signIn(provider, { callbackUrl: "/dashboard/chat" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign in with " + provider,
        variant: "destructive",
      })
    }
  }

  const providerName = pendingOAuthProvider === "github" ? "GitHub" : "Google"

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="relative overflow-hidden border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-600/5" />
        <CardHeader className="relative space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base text-foreground/80 dark:text-foreground/75">Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {error ? <CardAlert severity="danger" title="Sign-in failed" description={error} className="mb-4" /> : null}

          {lastLoginMethod !== "unknown" ? (
            <CardAlert
              severity="info"
              title="Recent activity"
              description={`Last login method: ${formatLoginMethodLabel(lastLoginMethod)}`}
              className="mb-4"
            />
          ) : null}

          <GoogleOneTap callbackUrl="/dashboard/chat" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="pl-10 h-12 border-2 focus:border-orange-500 transition-colors"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-12 h-12 border-2 focus:border-orange-500 transition-colors"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-orange-500/80"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>

            <PhoneOtpVerification purpose="login" onVerifiedChange={({ verified }) => setPhoneVerified(verified)} />
            {phoneVerified ? <p className="text-xs text-green-700 dark:text-green-400">Phone verified by server challenge.</p> : null}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.remember}
                onCheckedChange={(checked) => setFormData({ ...formData, remember: !!checked })}
              />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 border-2 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors bg-transparent"
              onClick={() => setPendingOAuthProvider("github")}
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
            <Button
              variant="outline"
              className="h-12 border-2 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors bg-transparent"
              onClick={() => setPendingOAuthProvider("google")}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
          </div>
        </CardContent>
        <CardFooter className="relative flex flex-col items-center justify-center space-y-2">
          <div className="text-sm text-foreground/75 dark:text-foreground/70">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>

      <CardAlertDialog
        open={pendingOAuthProvider !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingOAuthProvider(null)
          }
        }}
        severity="warning"
        title="Confirm account link"
        description={`Continue with ${providerName} to link this provider to your RunAsh account and merge any active guest session data.`}
        confirmLabel={`Continue with ${providerName}`}
        cancelLabel="Stay on sign in"
        confirmAriaLabel={`Confirm account link with ${providerName}`}
        onConfirm={() => {
          if (pendingOAuthProvider) {
            void handleOAuthSignIn(pendingOAuthProvider)
            setPendingOAuthProvider(null)
          }
        }}
      />
    </div>
  )
}
