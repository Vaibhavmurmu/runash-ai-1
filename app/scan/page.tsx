"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock3, Loader2, QrCode, RotateCcw, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PaymentStep = 1 | 2 | 3 | 4
type TransactionLifecycleState = "initiated" | "pending" | "success" | "failed"
type ApiLifecycleState = TransactionLifecycleState
type UpiErrorCode = "INVALID_PIN" | "PIN_ATTEMPTS_EXCEEDED" | "RISK_BLOCKED"

type UpiStatusResponse = {
  transactionId: string
  status: ApiLifecycleState
  transactionReference: string
  updatedAt: string
  failedReason?: string
  errorCode?: UpiErrorCode
}

const POLL_INTERVAL_MS = 3_000
const MAX_POLL_ATTEMPTS = 10

function mapPaymentErrorCodeToMessage(code?: string, fallback?: string) {
  if (code === "INVALID_PIN") return "The entered PIN is incorrect. Please try again."
  if (code === "PIN_ATTEMPTS_EXCEEDED") return "PIN attempts exceeded. Restart payment for security."
  if (code === "RISK_BLOCKED") return "Payment blocked for security checks. Try again later or contact support."
  return fallback ?? "Payment request failed."
}

export default function ScanPayPage() {
  const [step, setStep] = useState<PaymentStep>(1)
  const [isInitiating, setIsInitiating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [transactionState, setTransactionState] = useState<TransactionLifecycleState>("initiated")
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [transactionReference, setTransactionReference] = useState<string | null>(null)
  const [statusPayload, setStatusPayload] = useState<UpiStatusResponse | null>(null)
  const [pollAttempts, setPollAttempts] = useState(0)
  const [didPollTimeout, setDidPollTimeout] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [upiPin, setUpiPin] = useState("")

  const statusLine = useMemo(() => {
    if (transactionState === "success") return "Payment confirmed."
    if (transactionState === "failed") return "Payment failed."
    if (didPollTimeout) return "Payment confirmation timed out."
    if (transactionState === "pending") return "Awaiting UPI confirmation…"
    return "Transaction initiated."
  }, [didPollTimeout, transactionState])

  const startPayment = useCallback(async () => {
    setIsInitiating(true)
    setErrorMessage(null)
    setDidPollTimeout(false)
    setPollAttempts(0)
    setStatusPayload(null)
    setUpiPin("")
    setTransactionReference(null)

    try {
      const idempotencyKey = crypto.randomUUID()
      const response = await fetch("/api/upi/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({ idempotencyKey }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.transactionId) {
        throw new Error(mapPaymentErrorCodeToMessage(payload?.errorCode, payload?.error ?? "Unable to initiate payment"))
      }

      setTransactionId(payload.transactionId)
      setTransactionState("initiated")
      setStep(2)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to initiate payment")
      setTransactionState("failed")
      setStep(3)
    } finally {
      setIsInitiating(false)
    }
  }, [])

  const confirmPayment = useCallback(async () => {
    if (!transactionId) return

    setIsConfirming(true)
    setErrorMessage(null)

    try {
      const idempotencyKey = crypto.randomUUID()
      const response = await fetch("/api/upi/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          transactionId,
          pin: upiPin,
          idempotencyKey,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(mapPaymentErrorCodeToMessage(payload?.errorCode, payload?.error))
      }

      setTransactionReference(payload.transactionReference)
      setTransactionState("pending")
      setStep(3)
      setPollAttempts(0)
      setDidPollTimeout(false)
      setStatusPayload(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to confirm payment")
    } finally {
      setIsConfirming(false)
    }
  }, [transactionId, upiPin])

  const fetchStatus = useCallback(async (id: string) => {
    setIsCheckingStatus(true)

    try {
      const response = await fetch(`/api/upi/status/${id}`, {
        method: "GET",
        cache: "no-store",
      })

      const payload = (await response.json()) as UpiStatusResponse & { error?: string; errorCode?: UpiErrorCode }
      if (!response.ok && response.status !== 404) {
        throw new Error(mapPaymentErrorCodeToMessage(payload?.errorCode, payload?.error ?? "Unable to fetch status"))
      }

      setStatusPayload(payload)
      setTransactionReference(payload.transactionReference)

      if (payload.status === "success") {
        setTransactionState("success")
        setStep(4)
        return "terminal"
      }

      if (payload.status === "failed") {
        setTransactionState("failed")
        setErrorMessage(mapPaymentErrorCodeToMessage(payload.errorCode, payload.failedReason ?? "Payment failed"))
        return "terminal"
      }

      setTransactionState("pending")
      return "continue"
    } catch (error) {
      setTransactionState("failed")
      setErrorMessage(error instanceof Error ? error.message : "Unable to fetch payment status")
      return "terminal"
    } finally {
      setIsCheckingStatus(false)
    }
  }, [])

  const retryStatusPolling = useCallback(() => {
    setDidPollTimeout(false)
    setPollAttempts(0)
    setErrorMessage(null)
    setTransactionState("pending")
  }, [])

  useEffect(() => {
    if (!transactionId || transactionState !== "pending" || didPollTimeout) {
      return
    }

    let cancelled = false

    const poll = async () => {
      if (cancelled) return

      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        setDidPollTimeout(true)
        return
      }

      const result = await fetchStatus(transactionId)
      if (result === "continue") {
        setPollAttempts((attempts) => attempts + 1)
      }
    }

    const timer = window.setTimeout(() => {
      void poll()
    }, pollAttempts === 0 ? 0 : POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [didPollTimeout, fetchStatus, pollAttempts, transactionId, transactionState])

  return (
    <main className="container mx-auto px-4 py-10">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Scan & Pay</CardTitle>
          <CardDescription>UPI checkout flow with backend PIN validation, execution controls, and status reconciliation.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">Step {step} of 4</p>
            <p className="text-muted-foreground">{statusLine}</p>
            {transactionId ? <p className="mt-2 font-mono text-xs">Transaction: {transactionId}</p> : null}
            {transactionReference ? <p className="mt-1 font-mono text-xs">Reference: {transactionReference}</p> : null}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Start a payment before confirming it with UPI PIN.</p>
              <Button onClick={() => void startPayment()} disabled={isInitiating}>
                {isInitiating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Initiate UPI payment
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <ShieldAlert className="h-4 w-4" />
                <p>Enter UPI PIN to confirm. PIN validation and retry limits are enforced by backend.</p>
              </div>
              <Label htmlFor="upi-pin">UPI PIN</Label>
              <Input
                id="upi-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={upiPin}
                onChange={(event) => setUpiPin(event.target.value)}
                placeholder="Enter UPI PIN"
              />
              <Button onClick={() => void confirmPayment()} disabled={isConfirming || !transactionId}>
                {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm & Execute payment
              </Button>
              {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
            </div>
          ) : null}

          {step >= 3 && step <= 4 ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {transactionState === "failed" ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock3 className="h-4 w-4 text-amber-600" />
                )}
                <span>
                  {transactionState === "failed"
                    ? "Payment could not be confirmed."
                    : didPollTimeout
                      ? "Confirmation timeout reached."
                      : "Payment initiated. Waiting for final confirmation."}
                </span>
              </div>

              {isCheckingStatus ? <p className="text-xs text-muted-foreground">Refreshing status from /api/upi/status/[transactionId]…</p> : null}

              {statusPayload ? (
                <div className="rounded bg-muted/50 p-3 text-xs space-y-1">
                  <p>Status: {statusPayload.status}</p>
                  <p>Reference: {statusPayload.transactionReference}</p>
                  <p>Last update: {new Date(statusPayload.updatedAt).toLocaleString()}</p>
                </div>
              ) : null}

              {transactionState === "failed" ? <p className="text-xs text-red-600">{errorMessage ?? "Payment failed"}</p> : null}

              {didPollTimeout ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={retryStatusPolling}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Retry status check
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/payment/runash-pay">Back to RunAsh Pay</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 && statusPayload?.status === "success" ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Payment Successful</p>
              </div>
              <p>Transaction reference: <span className="font-mono">{statusPayload.transactionReference}</span></p>
              <p>Confirmed at: {new Date(statusPayload.updatedAt).toLocaleString()}</p>
              <Button asChild variant="outline" className="mt-2">
                <Link href="/payment/runash-pay">Back to RunAsh Pay</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
