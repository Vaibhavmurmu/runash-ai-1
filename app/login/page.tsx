"use client"

import type React from "react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { getAuthSession } from "@/lib/auth/access-client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, EyeOff, Github, Mail, Loader2, AlertCircle, Building2, Smartphone, Shield, KeyRound } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { GoogleOneTap } from "@/components/auth/google-one-tap"
import { MagicLinkForm } from "@/components/auth/magic-link-form"
import { OTPForm } from "@/components/auth/otp-form"
import { PasskeyLoginForm } from "@/components/auth/passkey-form"
import { SSOLogin } from "@/components/auth/sso-login"
import { formatLoginMethodLabel, getLastLoginMethod, setLastLoginMethod, type LoginMethod } from "@/lib/auth/last-login-method"
import { FooterBrand } from "@/components/branding/footer-brand"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [lastLoginMethod, setLastLoginMethodState] = useState<LoginMethod>("unknown")
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null)
  const [organization, setOrganization] = useState("runash-core")
  const [platform, setPlatform] = useState("web")
  const [authState, setAuthState] = useState<"loading" | "signed-in" | "signed-out">("signed-out")
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false })
  const router = useRouter()

  useEffect(() => {
    setLastLoginMethodState(getLastLoginMethod())
    setLastLoginAt(window.localStorage.getItem("runash_last_login_at"))
  }, [])

  const markLoginTime = () => {
    const value = new Date().toISOString()
    window.localStorage.setItem("runash_last_login_at", value)
    setLastLoginAt(value)
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      } else {
        markLoginTime()
        const session = await getAuthSession()
        if (session?.user) {
          router.push("/dashboard/chat")
        }
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      setLastLoginMethod(provider === "google" || provider === "github" ? provider : "unknown")
      markLoginTime()
      await signIn(provider, { callbackUrl: "/dashboard/chat" })
    } catch {
      setError("Failed to sign in with " + provider)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-white dark:from-[#05070f] dark:via-[#0b1020] dark:to-[#070a14] text-slate-900 dark:text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.20),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.15),transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.16),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(61,81,255,0.12),transparent_45%)]" />

      <header className="relative z-10 w-full py-6 px-6 flex justify-between items-center">
        <Link href="/home" className="flex items-center group">
          <div className="relative mr-3 h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-white to-yellow-50 dark:from-white dark:to-gray-50 shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Image src="/logo.png" alt="RunAsh logo" fill className="object-contain p-1" sizes="40px" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent">RunAsh</span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/get-started" className="text-sm text-slate-700 dark:text-white/70 hover:text-orange-500 dark:hover:text-white transition-colors">
            Create account
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="hidden lg:block" />

          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-2xl border border-orange-200/60 dark:border-white/10 bg-white/90 dark:bg-[#151824]/95 backdrop-blur-xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-4xl font-semibold bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 bg-clip-text text-transparent">Welcome back</CardTitle>
                <CardDescription className="text-slate-700/80 dark:text-white/65">Choose account, organization, platform, and auth state to continue.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-white/50">Organization switcher</Label>
                    <Select value={organization} onValueChange={setOrganization}>
                      <SelectTrigger className="h-10 border-orange-200 dark:border-white/15 bg-white/70 dark:bg-white/5 text-slate-800 dark:text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="runash-core">RunAsh AI</SelectItem>
                        <SelectItem value="runash-chat">RunAshChat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-600 dark:text-white/50">Platform switcher</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="h-10 border-orange-200 dark:border-white/15 bg-white/70 dark:bg-white/5 text-slate-800 dark:text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">web</SelectItem>
                        <SelectItem value="mobile">mobile</SelectItem>
                        <SelectItem value="mobile">API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Tabs value={authState} onValueChange={(value) => setAuthState(value as typeof authState)}>
                  <TabsList className="grid w-full grid-cols-3 bg-orange-50 dark:bg-white/5 border border-orange-100 dark:border-white/10">
                    <TabsTrigger value="loading">Auth loading</TabsTrigger>
                    <TabsTrigger value="signed-in">Signed in</TabsTrigger>
                    <TabsTrigger value="signed-out">Signed out</TabsTrigger>
                  </TabsList>
                </Tabs>

                <Card className="border-orange-100 dark:border-white/10 bg-orange-50/60 dark:bg-white/[0.04]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">RunAsh user</p>
                        <p className="text-xs text-slate-600 dark:text-white/60">{formData.email || "admin@runash.in"}</p>
                        <p className="text-xs text-slate-500 dark:text-white/45 mt-1">Org: {organization.replace("-", " ")} · Platform: {platform}</p>
                        {lastLoginAt ? <p className="text-xs text-slate-500 dark:text-white/45 mt-1">Last login: {new Date(lastLoginAt).toLocaleString()}</p> : null}
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full border border-orange-200 dark:border-white/20 text-slate-700 dark:text-white/70">
                        {authState === "loading" ? "Loading" : authState === "signed-in" ? "Signed in" : "Signed out"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert> : null}
                {lastLoginMethod !== "unknown" ? <Alert className="border-orange-200 dark:border-white/15 bg-orange-50 dark:bg-white/5"><AlertDescription>Last login method: {formatLoginMethodLabel(lastLoginMethod)}</AlertDescription></Alert> : null}

                <GoogleOneTap callbackUrl="/dashboard/chat" />

                <div className="space-y-3">
                  <Button onClick={() => handleOAuthSignIn("google")} variant="outline" className="w-full h-12 border-orange-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-white/10" disabled={isLoading}><Mail className="mr-3 h-5 w-5 text-red-500" />Continue with Google</Button>
                  <Button onClick={() => handleOAuthSignIn("github")} variant="outline" className="w-full h-12 border-orange-200 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-white/10" disabled={isLoading}><Github className="mr-3 h-5 w-5" />Continue with GitHub</Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-orange-100 dark:border-white/10" /></div>
                  <div className="relative flex justify-center text-sm"><span className="px-4 bg-white dark:bg-[#151824] text-slate-500 dark:text-white/50">Or continue with email</span></div>
                </div>

                <Collapsible>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm text-slate-700 dark:text-white/70">Advanced auth options</h3>
                    <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="text-slate-700 dark:text-white/80">Show</Button></CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 w-full border-orange-200 dark:border-white/15 bg-transparent"><Shield className="mr-2 h-4 w-4" /> Magic Link</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Magic Link Sign In</DialogTitle></DialogHeader><MagicLinkForm /></DialogContent>
                    </Dialog>
                    <Card className="border-orange-100 dark:border-white/10 bg-orange-50/40 dark:bg-white/[0.03] md:col-span-2"><CardContent className="p-4 space-y-3"><div className="flex items-center gap-2 text-sm font-medium"><Smartphone className="h-4 w-4" /> Phone / OTP (send code, verify, resend)</div><OTPForm purpose="login" /></CardContent></Card>
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 w-full border-orange-200 dark:border-white/15 bg-transparent"><KeyRound className="mr-2 h-4 w-4" /> Pass / Biometric</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Passkey / Biometric Login</DialogTitle></DialogHeader><PasskeyLoginForm /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 w-full border-orange-200 dark:border-white/15 bg-transparent"><Building2 className="mr-2 h-4 w-4" /> Enterprise SSO</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[520px]"><DialogHeader><DialogTitle>Enterprise SSO</DialogTitle></DialogHeader><SSOLogin /></DialogContent>
                    </Dialog>
                  </CollapsibleContent>
                </Collapsible>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required className="h-12 border-orange-200 dark:border-white/15 bg-white dark:bg-black/40" autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-sm text-slate-600 dark:text-white/75">Forgot password?</Link></div>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} required className="h-12 pr-12 border-orange-200 dark:border-white/15 bg-white dark:bg-black/40" autoComplete="current-password" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-12 w-12" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2"><Checkbox id="rememberMe" checked={formData.rememberMe} onCheckedChange={(checked) => handleInputChange("rememberMe", checked as boolean)} /><Label htmlFor="rememberMe" className="text-sm text-slate-600 dark:text-white/65">Remember me for 30 days</Label></div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white hover:opacity-90 font-medium">{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign in"}</Button>
                </form>

                <Card className="border-orange-100 dark:border-white/10 bg-orange-50/60 dark:bg-white/[0.02]"><CardContent className="p-4"><p className="font-medium">✨ SSO for Team & Enterprise accounts.</p><p className="text-xs text-slate-600 dark:text-white/55 mt-1">Give your organization the enterprise grand security access controls, dedicated support and more..</p></CardContent></Card>

                <div className="text-center pt-2"><p className="text-sm text-slate-600 dark:text-white/65">Don&apos;t have an account? <Link href="/get-started" className="font-medium text-orange-600 dark:text-white hover:opacity-80">Sign up for free</Link></p></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3">
              <FooterBrand />
              <p className="text-sm text-slate-500 dark:text-white/45">© {new Date().getFullYear()} RunAsh AI. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <Link href="/support" className="text-sm text-slate-500 dark:text-white/45 hover:text-orange-500 dark:hover:text-white">Help Center</Link>
              <Link href="/terms" className="text-sm text-slate-500 dark:text-white/45 hover:text-orange-500 dark:hover:text-white">Terms</Link>
              <Link href="/privacy" className="text-sm text-slate-500 dark:text-white/45 hover:text-orange-500 dark:hover:text-white">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
