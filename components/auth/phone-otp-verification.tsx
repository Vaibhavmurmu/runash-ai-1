"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PhoneOtpVerificationProps {
  purpose: "login" | "registration"
  onVerifiedChange?: (payload: { verified: boolean; phoneNumber: string }) => void
}

export function PhoneOtpVerification({ purpose, onVerifiedChange }: PhoneOtpVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [serverVerified, setServerVerified] = useState(false)
  const [message, setMessage] = useState("")
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = window.setInterval(() => {
      setCooldownSeconds((value) => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownSeconds])

  useEffect(() => {
    onVerifiedChange?.({ verified: serverVerified, phoneNumber })
  }, [onVerifiedChange, phoneNumber, serverVerified])

  const canSend = useMemo(() => phoneNumber.length > 0 && cooldownSeconds === 0 && !serverVerified, [cooldownSeconds, phoneNumber, serverVerified])

  const sendCode = async () => {
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, purpose }),
      })

      const data = (await response.json()) as { success?: boolean; message?: string; cooldownSeconds?: number }
      setMessage(data.message ?? "OTP requested")
      if (data.cooldownSeconds) {
        setCooldownSeconds(data.cooldownSeconds)
      }
    } catch {
      setMessage("Unable to send OTP. Please retry.")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/phone-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, purpose, code: otpCode }),
      })

      const data = (await response.json()) as { success?: boolean; verified?: boolean; message?: string }
      const verified = Boolean(response.ok && data.success && data.verified)
      setServerVerified(verified)
      setMessage(data.message ?? (verified ? "Phone verified" : "Verification failed"))
    } catch {
      setServerVerified(false)
      setMessage("Unable to verify OTP.")
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/phone-otp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, purpose }),
      })

      const data = (await response.json()) as { message?: string; cooldownSeconds?: number }
      setMessage(data.message ?? "OTP resent")
      if (data.cooldownSeconds) {
        setCooldownSeconds(data.cooldownSeconds)
      }
    } catch {
      setMessage("Unable to resend OTP.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-orange-200/60 bg-orange-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-orange-900">
          <Smartphone className="h-4 w-4" />
          Phone verification
        </div>
        <div
          className={cn(
            "text-xs rounded-full px-2 py-1 border",
            serverVerified ? "border-green-500 bg-green-100 text-green-700" : "border-orange-300 bg-white text-orange-700",
          )}
        >
          {serverVerified ? (
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
          ) : (
            "Not verified"
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${purpose}-phone`}>Phone number</Label>
        <Input
          id={`${purpose}-phone`}
          value={phoneNumber}
          onChange={(event) => {
            setPhoneNumber(event.target.value)
            setServerVerified(false)
          }}
          placeholder="+15551234567"
          autoComplete="tel"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${purpose}-otp`}>One-time code</Label>
        <Input
          id={`${purpose}-otp`}
          value={otpCode}
          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter 6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={sendCode} disabled={!canSend || isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send code
        </Button>
        <Button type="button" variant="secondary" onClick={verifyCode} disabled={isLoading || otpCode.length !== 6 || !phoneNumber}>
          Verify
        </Button>
        <Button type="button" variant="ghost" onClick={resendCode} disabled={isLoading || cooldownSeconds > 0 || !phoneNumber || serverVerified}>
          {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend"}
        </Button>
      </div>

      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
