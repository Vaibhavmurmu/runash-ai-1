"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Shield,
  Smartphone,
  Bell,
  Zap,
} from "lucide-react"

import { MagicLinkForm } from "@/components/auth/magic-link-form"
import { OTPForm } from "@/components/auth/otp-form"
import { PasskeyLoginForm } from "@/components/auth/passkey-form"
import { SSOLogin } from "@/components/auth/sso-login"
import ThemeToggle from "@/components/theme-toggle"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { registerWithUnifiedRoute } from "@/lib/auth/register-client"

const ROLE_OPTIONS = [
  { key: "creator", title: "Creator", desc: "Go live, manage streams, engage your audience" },
  { key: "seller", title: "Seller", desc: "Set up store, manage orders, run live shopping" },
  { key: "buyer", title: "Buyer", desc: "Shop groceries, track orders, chat for help" },
  { key: "enterprise", title: "Enterprise", desc: "SSO, admin controls, org analytics" },
] as const

type UserRole = (typeof ROLE_OPTIONS)[number]["key"]

const strengthColor = (score: number) => {
  if (score <= 1) return "bg-red-500"
  if (score <= 2) return "bg-orange-500"
  if (score <= 3) return "bg-yellow-500"
  return "bg-emerald-500"
}

const strengthLabel = (score: number) => {
  if (score <= 1) return "Weak"
  if (score <= 2) return "Fair"
  if (score <= 3) return "Good"
  return "Strong"
}

export default function GetStartedPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showRoadmap, setShowRoadmap] = useState(false)
  const [error, setError] = useState("")
  const [captchaA, setCaptchaA] = useState(2)
  const [captchaB, setCaptchaB] = useState(7)
  const [captchaAnswer, setCaptchaAnswer] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    username: "",
    platforms: [] as string[],
  })

  useEffect(() => {
    const stored = window.localStorage.getItem("runash_user_type")
    if (stored) setSelectedRole(stored as UserRole)
  }, [])

  useEffect(() => {
    if (selectedRole) window.localStorage.setItem("runash_user_type", selectedRole)
  }, [selectedRole])

  const refreshCaptcha = () => {
    setCaptchaA(Math.floor(Math.random() * 8) + 1)
    setCaptchaB(Math.floor(Math.random() * 8) + 1)
    setCaptchaAnswer("")
  }

  const passwordStrength = useMemo(() => {
    let score = 0
    if (formData.password.length >= 8) score += 1
    if (/[A-Z]/.test(formData.password)) score += 1
    if (/[0-9]/.test(formData.password)) score += 1
    if (/[^A-Za-z0-9]/.test(formData.password)) score += 1
    return score
  }, [formData.password])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      platforms: checked ? [...prev.platforms, platform] : prev.platforms.filter((item) => item !== platform),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      if (step === 1) {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match")
          return
        }
        if (Number(captchaAnswer) !== captchaA + captchaB) {
          setError("CAPTCHA verification failed")
          refreshCaptcha()
          return
        }

        const registration = await registerWithUnifiedRoute({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          username: formData.username,
        })

        if (registration.ok) {
          const needsVerification = registration.user?.emailVerified === false || /verify your (account|email)/i.test(registration.message)
          if (needsVerification) {
            setError("We sent a verification link to your email. Verify your account, then continue.")
          }

          setStep(2)
        } else {
          setError(registration.message || "Unable to create account. Please try again.")
        }
      } else if (step === 2) {
        setStep(3)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    await signIn(provider, { callbackUrl: "/post-login" })
    setIsLoading(false)
  }

  return (
             <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-white dark:from-[#05070f] dark:via-[#0b1020] dark:to-[#070a14] text-slate-900 dark:text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.20),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(250,204,21,0.15),transparent_45%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.18),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(61,81,255,0.10),transparent_45%)]" />

      <header className="relative z-10 flex items-center justify-between px-5 py-6">
        <Link href="/" className="font-semibold bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 bg-clip-text text-transparent">
          RunAsh
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" className="rounded-full bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20" onClick={() => router.push("/login")}>
            Log in
          </Button>
          <Button className="rounded-full bg-black border border-white/20 hover:bg-black/80 text-white" onClick={() => setOpen(true)}>
            Sign up for free
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-160px)] items-center justify-center px-6">
        <div className="w-full max-w-4xl text-center space-y-8">
          <Button
            variant="outline"
            onClick={() => setShowRoadmap(true)}
            className="rounded-full border-orange-200 dark:border-white/20 bg-white/70 dark:bg-white/10 text-slate-700 dark:text-white"
          >
            <Bell className="w-4 h-4" />
            <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">
               <Badge varient="secondary" className="bg-green-600 text-white gap-2 space-x-1 dark:bg-green-500 animate-pulse text-xs">New</Badge>
                 RunAsh Auth is in active development!{" "}
              <a href="https://doc.runash.in/roadmap" className="underline font-semibold hover:text-orange-200">
                Learn more
              </a>
            </span>
          </Button>

          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight">Get started in minutes</h1>
          <p className="text-base text-slate-600 dark:text-white/65 max-w-2xl mx-auto">
            RunAsh Auth pages use custom orange, yellow and white gradient styling with both light and dark support.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button className="rounded-full px-10 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white hover:opacity-90" onClick={() => { setStep(1); setOpen(true) }}>
              Get started
            </Button>
            <Button asChild variant="outline" className="rounded-full px-10 border-orange-200 dark:border-white/20 bg-white/70 dark:bg-black/40">
              <Link href="/waitlist" aria-label="Join the RunAsh waitlist">Join waitlist</Link>
            </Button>
            <Button variant="outline" className="rounded-full px-10 border-orange-200 dark:border-white/20 bg-white/70 dark:bg-black/40" onClick={() => router.push("/login")}>
              Welcome back
            </Button>
          </div>

          <Card className="mx-auto max-w-3xl text-left border-orange-200/60 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="font-semibold">✨ Model dialog card customization</div>
              <p className="text-sm text-slate-600 dark:text-white/60">Post-login, configure model dialog cards for upload screenshots, trusted client scopes, and consent-aware prompts.</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showRoadmap} onOpenChange={setShowRoadmap}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border border-orange-200 dark:border-white/15 bg-white dark:bg-[#101424]">
          <DialogHeader>
            <DialogTitle>RunAsh Auth roadmap</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="font-medium">What&apos;s supported today and what&apos;s coming next</p>
            <Card className="border-orange-200 dark:border-white/10">
              <CardContent className="p-4 space-y-2">
                <p><strong>Beta</strong></p>
                <p>RunAsh Auth is in Beta. Share feedback on Discord or via RunAsh Console.</p>
                <p className="text-slate-600 dark:text-white/70">RunAsh Auth is in active development. This page shows what&apos;s currently supported and what we&apos;re working on next.</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-white/10">
              <CardContent className="p-4">
                <p><strong>General availability</strong></p>
                <p>RunAsh Auth is targeting general availability this quarter. We&apos;re actively working on additional plugins and features to bring RunAsh Auth out of beta.</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold">Frameworks</p>
                <p>✅ Next.js — Supported</p>
                <p>🔜 Standalone frontend + backend — Coming soon</p>
                <p>Based on demand — Other frameworks</p>
                <p className="text-slate-600 dark:text-white/70">Standalone architectures with separate frontend/backend domains are not yet supported due to secure HTTP-only cookie constraints.</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold">Better Auth plugins</p>
                <p>✅ Supported: Email & password, Social OAuth (Google, GitHub), Email OTP, Admin, JWT, Open API.</p>
                <p>⚠️ Partial: Organization (invitation emails, JWT token claims in progress).</p>
                <p>🔜 Coming soon: Magic link, webhooks, phone BYO SMS provider, MFA, plugin customization.</p>
                <p>Based on demand: Other plugins.</p>
              </CardContent>
            </Card>
            <p className="text-slate-600 dark:text-white/70">Need help? Join our Discord Server or see Support options.</p>
            <p className="text-xs text-slate-500 dark:text-white/55">Last updated: February 23, 2026</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><span className="hidden" /></DialogTrigger>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[92vh] overflow-y-auto border border-orange-200 dark:border-white/10 bg-white/95 dark:bg-[#151824]/95 text-slate-900 dark:text-white shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl">Log in or sign up</DialogTitle></DialogHeader>

          <div className="mb-5">
            <div className="flex items-center justify-between max-w-md mx-auto relative">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step >= stepNumber ? "bg-gradient-to-r from-orange-500 to-yellow-400 text-white" : "bg-orange-50 dark:bg-black/40 text-slate-500 dark:text-white/60 border border-orange-100 dark:border-white/15"}`}>
                    {step > stepNumber ? <Check className="h-5 w-5" /> : stepNumber}
                  </div>
                  <span className="text-xs mt-2 text-slate-600 dark:text-white/75">{stepNumber === 1 ? "Account" : stepNumber === 2 ? "Profile" : "Complete"}</span>
                </div>
              ))}
              <div className="absolute left-0 right-0 top-5 h-px bg-orange-100 dark:bg-white/20 -z-0" />
            </div>
          </div>

            {step === 1 && (
            <Card className="mx-auto max-w-2xl border-orange-200 dark:border-white/10 bg-orange-50/40 dark:bg-white/[0.03]">
              <CardHeader className="pb-3 text-center">
                <CardTitle>Create account</CardTitle>
                <CardDescription className="text-slate-600 dark:text-white/60">Use OAuth, advanced auth, or continue with email. Email/password sign-up requires email verification before login.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11 border-orange-200 dark:border-white/15 bg-white dark:bg-white/5" onClick={() => handleOAuthSignIn("google")} disabled={isLoading}><Mail className="mr-2 h-4 w-4" />Continue with Google</Button>
                  <Button variant="outline" className="h-11 border-orange-200 dark:border-white/15 bg-white dark:bg-white/5" onClick={() => handleOAuthSignIn("github")} disabled={isLoading}><Github className="mr-2 h-4 w-4" />Continue with GitHub</Button>
                </div>

                <div className="text-center text-xs text-slate-500 dark:text-white/50">OR</div>

                <Collapsible>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm text-slate-700 dark:text-white/70">Advanced auth options</h3>
                    <CollapsibleTrigger asChild><Button variant="ghost" size="sm">Show</Button></CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Dialog><DialogTrigger asChild><Button variant="outline" className="h-11 border-orange-200 dark:border-white/15 bg-transparent"><Shield className="mr-2 h-4 w-4" />Magic Link</Button></DialogTrigger><DialogContent className="sm:max-w-[480px]"><MagicLinkForm /></DialogContent></Dialog>
                    <Dialog><DialogTrigger asChild><Button variant="outline" className="h-11 border-orange-200 dark:border-white/15 bg-transparent"><Smartphone className="mr-2 h-4 w-4" />Phone / OTP</Button></DialogTrigger><DialogContent className="sm:max-w-[480px]"><OTPForm purpose="login" /></DialogContent></Dialog>
                    <Dialog><DialogTrigger asChild><Button variant="outline" className="h-11 border-orange-200 dark:border-white/15 bg-transparent"><KeyRound className="mr-2 h-4 w-4" />Pass / Biometric</Button></DialogTrigger><DialogContent className="sm:max-w-[480px]"><PasskeyLoginForm /></DialogContent></Dialog>
                    <Dialog><DialogTrigger asChild><Button variant="outline" className="h-11 border-orange-200 dark:border-white/15 bg-transparent"><Building2 className="mr-2 h-4 w-4" />Enterprise SSO</Button></DialogTrigger><DialogContent className="sm:max-w-[520px]"><SSOLogin /></DialogContent></Dialog>
                  </CollapsibleContent>
                </Collapsible>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input placeholder="Full name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required className="bg-white dark:bg-black/50 border-orange-200 dark:border-white/15" />
                  <Input type="email" placeholder="Email address" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required className="bg-white dark:bg-black/50 border-orange-200 dark:border-white/15" />
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} required className="bg-white dark:bg-black/50 border-orange-200 dark:border-white/15 pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((prev) => !prev)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>

                  <div className="space-y-2">
                    <div className="h-2 w-full rounded bg-orange-100 dark:bg-white/10 overflow-hidden">
                      <div className={`h-full transition-all ${strengthColor(passwordStrength)}`} style={{ width: `${passwordStrength * 25}%` }} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-white/60">Password strength: {strengthLabel(passwordStrength)}</p>
                  </div>

                  <Input type="password" placeholder="Confirm password" value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} required className="bg-white dark:bg-black/50 border-orange-200 dark:border-white/15" />

                  <Card className="border-orange-100 dark:border-white/10 bg-white dark:bg-black/30">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Custom CAPTCHA</p>
                        <Button type="button" size="sm" variant="ghost" onClick={refreshCaptcha}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
                      </div>
                      <Label htmlFor="captcha" className="text-xs text-slate-600 dark:text-white/60">Solve: {captchaA} + {captchaB}</Label>
                      <Input id="captcha" inputMode="numeric" placeholder="Enter answer" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required className="bg-white dark:bg-black/50 border-orange-200 dark:border-white/15" />
                    </CardContent>
                  </Card>

                  <div className="flex items-start gap-2"><Checkbox id="terms" required className="mt-1" /><Label htmlFor="terms" className="text-xs text-slate-600 dark:text-white/60">By continuing you agree to cookies consent, scopes, and claims policy.</Label></div>
                  <Button type="submit" disabled={isLoading} className="w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white hover:opacity-90">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}</Button>
                  <p className="text-xs text-slate-500 dark:text-white/50 text-center">After sign-up, verify your email from the link we send before logging in.</p>
                </form>

                <div className="text-xs text-slate-500 dark:text-white/40">⇪ Upload screenshot-ready onboarding available after sign-in.</div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="mx-auto max-w-2xl border-orange-200 dark:border-white/10 bg-orange-50/40 dark:bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Set up your profile</CardTitle>
                <CardDescription className="text-slate-600 dark:text-white/60">Pick your role and profile basics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((role) => (
                    <button key={role.key} type="button" onClick={() => setSelectedRole(role.key)} className={`text-left rounded-lg border p-4 transition-colors ${selectedRole === role.key ? "border-orange-300 dark:border-white/70 bg-orange-100/60 dark:bg-white/10" : "border-orange-100 dark:border-white/10 hover:bg-orange-100/50 dark:hover:bg-white/[0.06]"}`}>
                      <div className="font-semibold">{role.title}</div>
                      <div className="text-sm text-slate-600 dark:text-white/60">{role.desc}</div>
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><Label htmlFor="username">Username</Label><Input id="username" value={formData.username} onChange={(e) => handleInputChange("username", e.target.value)} required className="bg-white dark:bg-black/50 border-orange-200 dark:border-white/15" /></div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {["Twitch", "YouTube", "Facebook", "Instagram"].map((platform) => (
                      <label key={platform} className="flex items-center gap-2 text-slate-700 dark:text-white/70">
                        <Checkbox checked={formData.platforms.includes(platform)} onCheckedChange={(checked) => handlePlatformChange(platform, checked as boolean)} />
                        {platform}
                      </label>
                    ))}
                  </div>
                  <Button type="submit" className="w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white hover:opacity-90" disabled={isLoading || !selectedRole}>{isLoading ? "Saving..." : "Complete onboarding"}</Button>
                </form>
              </CardContent>
            </Card>
          )}

            {step === 3 && (
            <Card className="mx-auto max-w-2xl border-orange-200 dark:border-white/10 bg-orange-50/40 dark:bg-white/[0.03]">
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white flex items-center justify-center mb-2"><Check className="h-6 w-6" /></div>
                <CardTitle>You&apos;re all set!</CardTitle>
                <CardDescription className="text-slate-600 dark:text-white/60">Choose where to continue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="explore">
                  <TabsList className="grid w-full grid-cols-3 bg-orange-50 dark:bg-black/40 border border-orange-100 dark:border-white/10">
                    <TabsTrigger value="explore">Explore</TabsTrigger>
                    <TabsTrigger value="setup">Setup</TabsTrigger>
                    <TabsTrigger value="learn">Learn</TabsTrigger>
                  </TabsList>
                  <TabsContent value="explore" className="grid gap-3 mt-4">
                    {[
                      { title: "Dashboard", desc: "Manage your workspace", icon: Zap, route: "/dashboard" },
                      { title: "Live Studio", desc: "Start streaming faster", icon: Play, route: "/live" },
                    ].map((item) => (
                      <Card key={item.title} className="cursor-pointer border-orange-100 dark:border-white/10 bg-white dark:bg-black/30 hover:border-orange-300 dark:hover:border-white/30" onClick={() => router.push(item.route)}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-orange-500 dark:text-white/80" />
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-slate-600 dark:text-white/60">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-500 dark:text-white/45" />
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="setup" className="mt-4 text-sm text-slate-600 dark:text-white/60">Quick setup guides coming soon.</TabsContent>
                  <TabsContent value="learn" className="mt-4 text-sm text-slate-600 dark:text-white/60">Learning resources coming soon.</TabsContent>
                </Tabs>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Button onClick={() => router.push("/consent")} className="rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 text-white hover:opacity-90">Continue to consent<ArrowRight className="ml-2 h-4 w-4" /></Button>
                  <Button variant="outline" className="rounded-full border-orange-200 dark:border-white/20 bg-white dark:bg-black/40" onClick={() => router.push("/post-login")}>Go to post-login</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
          
