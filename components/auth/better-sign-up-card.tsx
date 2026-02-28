"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardAlert } from "@/components/ui/card-alert"
import { registerWithUnifiedRoute } from "@/lib/auth/register-client"

export function BetterSignUpCard() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const passwordStrength = Math.min(100, Math.max(0, password.length * 12.5))

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign Up</CardTitle>
        <CardDescription className="text-xs md:text-sm">Create your account with secure email/password auth. You must verify your email before you can sign in and use protected features.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <CardAlert severity="danger" title="Sign-up failed" description={error} /> : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="first-name">First name</Label>
            <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="last-name">Last name</Label>
            <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <div className="h-2 rounded bg-muted">
            <div className="h-2 rounded bg-orange-500 transition-all" style={{ width: `${passwordStrength}%` }} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password-confirmation">Confirm password</Label>
          <Input
            id="password-confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <Button
          className="w-full"
          disabled={loading || password !== passwordConfirmation}
          onClick={async () => {
            setError(null)
            setLoading(true)

            try {
              const registration = await registerWithUnifiedRoute({
                email,
                password,
                name: `${firstName} ${lastName}`.trim(),
              })

              if (!registration.ok) {
                setError(registration.message)
                toast.error(registration.message)
                return
              }

              const isVerificationPending =
                registration.user?.emailVerified === false || /verify your (account|email)/i.test(registration.message)
              toast.success(isVerificationPending ? "Check your inbox to verify your email before logging in." : registration.message)
              router.push("/login")
            } catch (error) {
              setError("Unable to create account")
              toast.error("Unable to create account")
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Create your account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">We'll send a verification link to your inbox right after sign up.</p>
      </CardContent>
      <CardFooter>
        <p className="w-full border-t py-4 text-center text-xs text-neutral-500">Secured by better-auth</p>
      </CardFooter>
    </Card>
  )
}
