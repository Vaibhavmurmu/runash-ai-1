"use client"

import type React from "react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Check, ChevronRight, Github, Mail, Eye, EyeOff, Loader2, Play, Sparkles, Zap } from "lucide-react"
import { signIn } from "next-auth/react"
import ThemeToggle from "@/components/theme-toggle"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SSOLogin } from "@/components/auth/sso-login"
import { MagicLinkForm } from "@/components/auth/magic-link-form"
import { OTPForm } from "@/components/auth/otp-form"
import { PasskeyLoginForm } from "@/components/auth/passkey-form"
import { Building2, Smartphone, Shield, KeyRound } from "lucide-react"

const ROLE_OPTIONS = [
  {
    key: "creator",
    title: "Creator",
    desc: "Go live, manage streams, engage your audience",
  },
  {
    key: "seller",
    title: "Seller",
    desc: "Set up store, manage orders, run live shopping",
  },
  {
    key: "buyer",
    title: "Buyer",
    desc: "Shop groceries, track orders, chat for help",
  },
  {
    key: "enterprise",
    title: "Enterprise",
    desc: "SSO, admin controls, org analytics",
  },
] as const

export default function GetStartedPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<"creator" | "seller" | "buyer" | "enterprise" | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    username: "",
    platforms: [] as string[],
    contentTypes: [] as string[],
  })

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("runash_user_type") : null
    if (stored && !selectedRole) {
      setSelectedRole(stored as "creator" | "seller" | "buyer" | "enterprise")
    }
  }, [selectedRole])

  useEffect(() => {
    if (selectedRole) {
      window.localStorage.setItem("runash_user_type", selectedRole)
    }
  }, [selectedRole])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: "platforms" | "contentTypes", value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked ? [...prev[field], value] : prev[field].filter((item) => item !== value),
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
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
          }),
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

  const openGetStarted = () => {
    setStep(1)
    setOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950/20 dark:via-gray-950 dark:to-amber-950/20 text-gray-900 dark:text-white flex flex-col">
      <header className="w-full py-6 px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center group">
          <div className="relative mr-3 h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Image src="/RunAsh Logo.png" alt="RunAsh Logo" fill className="object-contain p-1" sizes="40px" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 dark:from-orange-400 dark:via-orange-300 dark:to-amber-300 text-transparent bg-clip-text">
            RunAsh
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            Already have an account?
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <Card className="mx-auto max-w-3xl border border-orange-200/60 dark:border-orange-900/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl bg-gradient-to-r from-orange-600 to-amber-600 text-transparent bg-clip-text">
                Get started with RunAsh
              </CardTitle>
              <CardDescription className="text-base">
                Create your account, pick your role, and launch into your personalized RunAsh workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={openGetStarted}
                className="h-12 px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-12 px-8" onClick={() => router.push("/live")}>
                <Play className="mr-2 h-4 w-4" />
                Watch demo
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[92vh] overflow-y-auto border border-orange-800/40 bg-slate-950/95 text-white backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-orange-200">Get started</DialogTitle>
          </DialogHeader>

          <div className="mb-8">
            <div className="flex items-center justify-between max-w-md mx-auto relative">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      step >= stepNumber
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg"
                        : "bg-slate-900 text-gray-400 border border-slate-700"
                    }`}
                  >
                    {step > stepNumber ? <Check className="h-5 w-5" /> : stepNumber}
                  </div>
                  <span className="text-xs mt-2 text-orange-100/90">
                    {stepNumber === 1 ? "Account" : stepNumber === 2 ? "Profile" : "Complete"}
                  </span>
                </div>
              ))}
              <div className="absolute left-0 right-0 top-5 h-px bg-slate-700 -z-0" />
            </div>
          </div>

          {step === 1 && (
            <Card className="mx-auto max-w-2xl border-orange-900/50 bg-slate-900/80">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-orange-100">Create your account</CardTitle>
                <CardDescription className="text-slate-300">Choose any auth method to continue.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Button onClick={() => handleOAuthSignIn("google")} variant="outline" className="h-11" disabled={isLoading}>
                    <Mail className="mr-2 h-4 w-4 text-red-500" /> Continue with Google
                  </Button>
                  <Button onClick={() => handleOAuthSignIn("github")} variant="outline" className="h-11" disabled={isLoading}>
                    <Github className="mr-2 h-4 w-4" /> Continue with GitHub
                  </Button>
                </div>

                <Collapsible>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm text-slate-300">Advanced sign-in options</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-orange-200 hover:text-orange-100">
                        Show
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-11 w-full bg-transparent">
                          <Shield className="mr-2 h-4 w-4" /> Magic Link
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><MagicLinkForm /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-11 w-full bg-transparent">
                          <Smartphone className="mr-2 h-4 w-4" /> OTP
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><OTPForm purpose="login" /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-11 w-full bg-transparent">
                          <KeyRound className="mr-2 h-4 w-4" /> Passkey
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[480px]"><PasskeyLoginForm /></DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="h-11 w-full bg-transparent">
                          <Building2 className="mr-2 h-4 w-4" /> SSO
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[520px]"><SSOLogin /></DialogContent>
                    </Dialog>
                  </CollapsibleContent>
                </Collapsible>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input placeholder="Full name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} required />
                  <Input type="email" placeholder="Email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} required />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                  />
                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" required className="mt-1" />
                    <Label htmlFor="terms" className="text-xs text-slate-300">I agree to Terms and Privacy Policy.</Label>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-orange-500 to-amber-500">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="mx-auto max-w-2xl border-orange-900/50 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-orange-100">Set up your profile</CardTitle>
                <CardDescription className="text-slate-300">Pick your role and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => setSelectedRole(role.key)}
                      className={`text-left rounded-lg border p-4 transition-colors ${
                        selectedRole === role.key ? "border-orange-400 bg-orange-950/30" : "border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-semibold text-white">{role.title}</div>
                      <div className="text-sm text-slate-300">{role.desc}</div>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={formData.username} onChange={(e) => handleInputChange("username", e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {["Twitch", "YouTube", "Facebook", "Instagram"].map((platform) => (
                      <label key={platform} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.platforms.includes(platform)}
                          onCheckedChange={(checked) => handleCheckboxChange("platforms", platform, checked as boolean)}
                        />
                        {platform}
                      </label>
                    ))}
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500" disabled={isLoading || !selectedRole}>
                    {isLoading ? "Saving..." : "Complete onboarding"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="mx-auto max-w-2xl border-orange-900/50 bg-slate-900/80">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl text-orange-100">You&apos;re all set!</CardTitle>
                <CardDescription className="text-slate-300">Finish setup and continue into RunAsh.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="explore" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="explore">Explore</TabsTrigger>
                    <TabsTrigger value="setup">Setup</TabsTrigger>
                    <TabsTrigger value="learn">Learn</TabsTrigger>
                  </TabsList>
                  <TabsContent value="explore" className="grid gap-3 mt-4">
                    {[
                      { title: "Dashboard", desc: "Manage your workspace", icon: Zap, route: "/dashboard" },
                      { title: "Live Studio", desc: "Start streaming faster", icon: Play, route: "/live" },
                    ].map((item) => (
                      <Card key={item.title} className="cursor-pointer border-slate-700 hover:border-orange-500" onClick={() => router.push(item.route)}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <item.icon className="h-5 w-5 text-orange-400" />
                          <div className="flex-1">
                            <p className="font-medium text-white">{item.title}</p>
                            <p className="text-sm text-slate-300">{item.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="setup" className="mt-4 text-sm text-slate-300">Quick setup guides coming soon.</TabsContent>
                  <TabsContent value="learn" className="mt-4 text-sm text-slate-300">Learning resources coming soon.</TabsContent>
                </Tabs>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Button onClick={() => router.push("/consent")} className="bg-gradient-to-r from-orange-500 to-amber-500">
                    Continue to consent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/post-login")}>
                    Go to post-login
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      <footer className="py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} RunAsh AI. All rights reserved.</p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <Link href="/support" className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors">Help Center</Link>
              <Link href="/terms" className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
