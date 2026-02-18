"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"
import { CardAlert } from "@/components/ui/card-alert"

const socialProviders = ["google", "github", "huggingface", "linkedin", "twitter"] as const

export function BetterSignInCard() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">Enter your email and password to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <CardAlert severity="danger" title="Sign-in failed" description={error} /> : null}

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs underline">
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
          <Label htmlFor="remember">Remember me</Label>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            setError(null)
            await signIn.email({
              email,
              password,
              rememberMe,
              callbackURL: "/dashboard",
              fetchOptions: {
                onRequest: () => setLoading(true),
                onResponse: () => setLoading(false),
                onError: (ctx) => setError(ctx.error.message),
              },
            })
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Login"}
        </Button>

        <Button
          variant="secondary"
          disabled={loading}
          className="w-full gap-2"
          onClick={async () => {
            setError(null)
            await signIn.passkey({
              fetchOptions: {
                onRequest: () => setLoading(true),
                onResponse: () => setLoading(false),
                onError: (ctx) => setError(ctx.error.message),
              },
            })
          }}
        >
          <Key size={16} />
          Sign-in with Passkey
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {socialProviders.map((provider) => (
            <Button
              key={provider}
              variant="outline"
              disabled={loading}
              onClick={async () => {
                setError(null)
                await signIn.social({
                  provider,
                  callbackURL: "/dashboard",
                  fetchOptions: {
                    onRequest: () => setLoading(true),
                    onResponse: () => setLoading(false),
                    onError: (ctx) => setError(ctx.error.message),
                  },
                })
              }}
            >
              {provider}
            </Button>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <p className="w-full border-t py-4 text-center text-xs text-neutral-500">Built with better-auth</p>
      </CardFooter>
    </Card>
  )
}
