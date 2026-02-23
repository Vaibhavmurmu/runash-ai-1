"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { ArrowRight, Building2, Check, ChevronRight, Eye, EyeOff, Github, KeyRound, Loader2, Mail, Play, Shield, Smartphone, Sparkles, Zap } from "lucide-react"

import { MagicLinkForm } from "@/components/auth/magic-link-form"
import { OTPForm } from "@/components/auth/otp-form"
import { PasskeyLoginForm } from "@/components/auth/passkey-form"
import { SSOLogin } from "@/components/auth/sso-login"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ROLE_OPTIONS = [
  { key: "creator", title: "Creator", desc: "Go live, manage streams, engage your audience" },
  { key: "seller", title: "Seller", desc: "Set up store, manage orders, run live shopping" },
  { key: "buyer", title: "Buyer", desc: "Shop groceries, track orders, chat for help" },
  { key: "enterprise", title: "Enterprise", desc: "SSO, admin controls, org analytics" },
] as const

type UserRole = (typeof ROLE_OPTIONS)[number]["key"]

export default function GetStartedPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
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
    if (stored) {
      setSelectedRole(stored as UserRole)
    }
  }, [])

  useEffect(() => {
    if (selectedRole) {
      window.localStorage.setItem("runash_user_type", selectedRole)
    }
  }, [selectedRole])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

    try {
      if (step === 1) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.name }),
        })

        if (response.ok) {
          setStep(2)
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
    <div className="min-h-screen bg-[#05070f] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,136,0,0.18),transparent_50%),radial-gradient(ellipse_at_top_right,rgba(61,81,255,0.12),transparent_45%)]" />

      <header className="relative z-10 flex items-center justify-between px-5 py-6">
        <Link href="/" className="font-semibold text-white/90">RunAsh</Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20" onClick={() => router.push("/login")}>
            Log in
          </Button>
          <Button className="rounded-full bg-black border border-white/20 hover:bg-black/80" onClick={() => setOpen(true)}>
            Sign up for free
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-160px)] items-center justify-center px-6">
        <div className="w-full max-w-4xl text-center space-y-8">
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight">Get started in minutes</h1>
          <p className="text-base text-white/65 max-w-2xl mx-auto">
            Merge of the previous RunAsh onboarding style with the new auth modal card flow. Click get started to open the authentication model dialog card.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button className="rounded-full px-10 bg-white text-black hover:bg-white/90" onClick={() => { setStep(1); setOpen(true) }}>
              Get started
            </Button>
            <Button variant="outline" className="rounded-full px-10 border-white/20 bg-black/40" onClick={() => router.push("/login")}>
              Welcome back
            </Button>
          </div>

          <Card className="mx-auto max-w-3xl text-left border-white/10 bg-white/5 shadow-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="font-semibold">✨ Model dialog card customization</div>
              <p className="text-sm text-white/60">Post-login, configure model dialog cards for upload screenshots, trusted client scopes, and consent-aware prompts.</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[92vh] overflow-y-auto border border-white/10 bg-[#151824]/95 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Log in or sign up</DialogTitle>
          </DialogHeader>

          <div className="mb-5">
            <div className="flex items-center justify-between max-w-md mx-auto relative">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      step >= stepNumber ? "bg-white text-black" : "bg-black/40 text-white/60 border border-white/15"
                    }`}
                  >
                    {step > stepNumber ? <Check className="h-5 w-5" /> : stepNumber}
                  </div>
                  <span className="text-xs mt-2 text-white/75">{stepNumber === 1 ? "Account" : stepNumber === 2 ? "Profile" : "Complete"}</span>
                </div>
              ))}
              <div className="absolute left-0 right-0 top-5 h-px bg-white/20 -z-0" />
            </div>
          </div>

          {step === 1 && (
            <Card className="mx-auto max-w-2xl border-white/10 bg-white/[0.03]">
              <CardHeader className="pb-3 text-center">
                <CardTitle>Create account</CardTitle>
                <CardDescription className="text-white/60">Choose account, organization, platform, and auth state to continue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11 border-white/15 bg-white/5" onClick={() => handleOAuthSignIn("google")} disabled={isLoading}><Mail className="mr-2 h-4 w-4" />Continue with Google</Button>
                  <Button variant="outline" className="h-11 border-white/15 bg-white/5" onClick={() => handleOAuthSignIn("github")} disabled={isLoading}><Github className="mr-2 h-4 w-4" />Continue with GitHub</Button>
                  <Button variant="outline" className="h-11 border-white/15 bg-white/5" onClick={() => handleOAuthSignIn("apple")} disabled={isLoading}>Continue with Apple</Button>
                  <Button variant="outline" className="h-11 border-white/15 bg-white/5" onClick={() => handleOAuthSignIn("microsoft")} disabled={isLoading}>Continue with Microsoft</Button>
                </div>

                <div className="text-center text-xs text-white/50">OR</div>

                <Collapsible>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm text-white/70">Advanced auth options</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">Show</Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 border-white/15 bg-transparent"><Shield className="mr-2 h-4 w-4" />Magic Link</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><MagicLinkForm /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 border-white/15 bg-transparent"><Smartphone className="mr-2 h-4 w-4" />Phone / OTP</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><OTPForm purpose="login" /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 border-white/15 bg-transparent"><KeyRound className="mr-2 h-4 w-4" />Passkey</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><PasskeyLoginForm /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" className="h-11 border-white/15 bg-transparent"><Building2 className="mr-2 h-4 w-4" />Enterprise SSO</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[520px]"><SSOLogin /></DialogContent>
                    </Dialog>
                  </CollapsibleContent>
                </Collapsible>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input placeholder="Full name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required className="bg-black/50 border-white/15" />
                  <Input type="email" placeholder="Email address" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required className="bg-black/50 border-white/15" />
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={(e) => handleInputChange("password", e.target.value)} required className="bg-black/50 border-white/15 pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input type="password" placeholder="Confirm password" value={formData.confirmPassword} onChange={(e) => handleInputChange("confirmPassword", e.target.value)} required className="bg-black/50 border-white/15" />
                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" required className="mt-1" />
                    <Label htmlFor="terms" className="text-xs text-white/60">By continuing you agree to cookies consent, scopes, and claims policy.</Label>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full rounded-full bg-white text-black hover:bg-white/90">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
                  </Button>
                </form>

                <div className="text-xs text-white/40">⇪ Upload screenshot-ready onboarding available after sign-in.</div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="mx-auto max-w-2xl border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Set up your profile</CardTitle>
                <CardDescription className="text-white/60">Pick your role and profile basics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => setSelectedRole(role.key)}
                      className={`text-left rounded-lg border p-4 transition-colors ${selectedRole === role.key ? "border-white/70 bg-white/10" : "border-white/10 hover:bg-white/[0.06]"}`}
                    >
                      <div className="font-semibold">{role.title}</div>
                      <div className="text-sm text-white/60">{role.desc}</div>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={formData.username} onChange={(e) => handleInputChange("username", e.target.value)} required className="bg-black/50 border-white/15" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {["Twitch", "YouTube", "Facebook", "Instagram"].map((platform) => (
                      <label key={platform} className="flex items-center gap-2 text-white/70">
                        <Checkbox checked={formData.platforms.includes(platform)} onCheckedChange={(checked) => handlePlatformChange(platform, checked as boolean)} />
                        {platform}
                      </label>
                    ))}
                  </div>

                  <Button type="submit" className="w-full rounded-full bg-white text-black hover:bg-white/90" disabled={isLoading || !selectedRole}>
                    {isLoading ? "Saving..." : "Complete onboarding"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="mx-auto max-w-2xl border-white/10 bg-white/[0.03]">
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-white text-black flex items-center justify-center mb-2">
                  <Check className="h-6 w-6" />
                </div>
                <CardTitle>You&apos;re all set!</CardTitle>
                <CardDescription className="text-white/60">Choose where to continue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="explore">
                  <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/10">
                    <TabsTrigger value="explore">Explore</TabsTrigger>
                    <TabsTrigger value="setup">Setup</TabsTrigger>
                    <TabsTrigger value="learn">Learn</TabsTrigger>
                  </TabsList>
                  <TabsContent value="explore" className="grid gap-3 mt-4">
                    {[
                      { title: "Dashboard", desc: "Manage your workspace", icon: Zap, route: "/dashboard" },
                      { title: "Live Studio", desc: "Start streaming faster", icon: Play, route: "/live" },
                    ].map((item) => (
                      <Card key={item.title} className="cursor-pointer border-white/10 bg-black/30 hover:border-white/30" onClick={() => router.push(item.route)}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-white/80" />
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-white/60">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/45" />
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="setup" className="mt-4 text-sm text-white/60">Quick setup guides coming soon.</TabsContent>
                  <TabsContent value="learn" className="mt-4 text-sm text-white/60">Learning resources coming soon.</TabsContent>
                </Tabs>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Button onClick={() => router.push("/consent")} className="rounded-full bg-white text-black hover:bg-white/90">
                    Continue to consent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="rounded-full border-white/20 bg-black/40" onClick={() => router.push("/post-login")}>
                    Go to post-login
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
