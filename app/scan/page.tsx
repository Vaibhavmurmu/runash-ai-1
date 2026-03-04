"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock3, Download, Loader2, QrCode, RotateCcw, ShieldAlert, Share2, XCircle } from "lucide-react"
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
  amount: number
  currency: string
  status: ApiLifecycleState
  transactionReference: string
  updatedAt: string
  failedReason?: string
  errorCode?: UpiErrorCode
}

type UpiTransactionReceipt = UpiStatusResponse & {
  receiptId: string
}

type PersistedTransactionState = {
  step: PaymentStep
  transactionState: TransactionLifecycleState
  transactionId: string | null
  transactionReference: string | null
}

const STORAGE_KEY = "runash:upi:inflight"
const POLL_INTERVAL_MS = 3_000
const MAX_POLL_ATTEMPTS = 10

function mapPaymentErrorCodeToMessage(code?: string, fallback?: string) {
  if (code === "INVALID_PIN") return "The entered PIN is incorrect. Please try again."
  if (code === "PIN_ATTEMPTS_EXCEEDED") return "PIN attempts exceeded. Restart payment for security."
  if (code === "RISK_BLOCKED") return "Payment blocked for security checks. Try again later or contact support."
  return fallback ?? "Payment request failed."
}

function formatCurrency(amount: number | null | undefined, currency = "INR") {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)
}

export default function ScanPayPage() {
  const [step, setStep] = useState<PaymentStep>(1)
  const [amount, setAmount] = useState("499")
  const [isInitiating, setIsInitiating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isSharingReceipt, setIsSharingReceipt] = useState(false)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const [transactionState, setTransactionState] = useState<TransactionLifecycleState>("initiated")
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [transactionReference, setTransactionReference] = useState<string | null>(null)
  const [statusPayload, setStatusPayload] = useState<UpiStatusResponse | null>(null)
  const [pollAttempts, setPollAttempts] = useState(0)
  const [didPollTimeout, setDidPollTimeout] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [upiPin, setUpiPin] = useState("")

  const parsedAmount = useMemo(() => {
    const numeric = Number(amount)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null
  }, [amount])

  const statusLine = useMemo(() => {
    if (transactionState === "success") return "Payment confirmed."
    if (transactionState === "failed") return "Payment failed."
    if (didPollTimeout) return "Payment confirmation timed out."
    if (transactionState === "pending") return "Awaiting UPI confirmation…"
    return "Transaction initiated."
  }, [didPollTimeout, transactionState])

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as PersistedTransactionState
      if (!parsed.transactionId) return
      setStep(parsed.step)
      setTransactionState(parsed.transactionState)
      setTransactionId(parsed.transactionId)
      setTransactionReference(parsed.transactionReference)
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const payload: PersistedTransactionState = {
      step,
      transactionState,
      transactionId,
      transactionReference,
    }

    if (!transactionId || transactionState === "success" || transactionState === "failed") {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [step, transactionId, transactionReference, transactionState])

  const startPayment = useCallback(async () => {
    if (!parsedAmount || isInitiating) return

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
        body: JSON.stringify({ idempotencyKey, amount: parsedAmount }),
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
  }, [isInitiating, parsedAmount])

  const confirmPayment = useCallback(async () => {
    if (!transactionId || isConfirming) return

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
  }, [isConfirming, transactionId, upiPin])

  const fetchStatus = useCallback(async (id: string) => {
    if (isCheckingStatus) return "continue"
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
  }, [isCheckingStatus])

  const retryStatusPolling = useCallback(() => {
    if (isCheckingStatus) return
    setDidPollTimeout(false)
    setPollAttempts(0)
    setErrorMessage(null)
    setTransactionState("pending")
    setStep(3)
  }, [isCheckingStatus])

  const resetToAmountStep = useCallback(() => {
    if (isInitiating || isConfirming || isCheckingStatus) return
    setStep(1)
    setErrorMessage(null)
    setUpiPin("")
    setTransactionId(null)
    setTransactionReference(null)
    setStatusPayload(null)
    setTransactionState("initiated")
    setDidPollTimeout(false)
    setPollAttempts(0)
    window.localStorage.removeItem(STORAGE_KEY)
  }, [isCheckingStatus, isConfirming, isInitiating])

  const backToAmountStep = useCallback(() => {
    if (isConfirming) return
    setStep(1)
    setErrorMessage(null)
  }, [isConfirming])

  const downloadReceipt = useCallback(async () => {
    if (!transactionId || isDownloadingReceipt) return

    setIsDownloadingReceipt(true)
    setShareMessage(null)

    try {
      const response = await fetch(`/api/upi/transactions/${transactionId}`, { cache: "no-store" })
      const payload = (await response.json()) as UpiTransactionReceipt & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load transaction details")
      }

      const data = {
        receiptId: payload.receiptId,
        transactionId: payload.transactionId,
        reference: payload.transactionReference,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        updatedAt: payload.updatedAt,
        failedReason: payload.failedReason ?? null,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${payload.receiptId}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "Unable to download receipt details")
    } finally {
      setIsDownloadingReceipt(false)
    }
  }, [isDownloadingReceipt, transactionId])

  const shareReceipt = useCallback(async () => {
    if (!transactionId || isSharingReceipt) return

    setIsSharingReceipt(true)
    setShareMessage(null)

    try {
      const response = await fetch(`/api/upi/transactions/${transactionId}`, { cache: "no-store" })
      const payload = (await response.json()) as UpiTransactionReceipt & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load receipt details")
      }

      const receiptText = [
        `RunAsh UPI Receipt (${payload.receiptId})`,
        `Transaction ID: ${payload.transactionId}`,
        `Reference: ${payload.transactionReference}`,
        `Amount: ${formatCurrency(payload.amount, payload.currency)}`,
        `Status: ${payload.status.toUpperCase()}`,
        `Updated At: ${new Date(payload.updatedAt).toLocaleString()}`,
      ].join("\n")

      if (navigator.share) {
        await navigator.share({
          title: `RunAsh Receipt ${payload.receiptId}`,
          text: receiptText,
          url: `${window.location.origin}/api/upi/transactions/${payload.transactionId}`,
        })
        setShareMessage("Receipt shared successfully.")
      } else {
        await navigator.clipboard.writeText(receiptText)
        setShareMessage("Receipt details copied to clipboard.")
      }
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : "Unable to share receipt details")
    } finally {
      setIsSharingReceipt(false)
    }
  }, [isSharingReceipt, transactionId])

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
            <div className="space-y-4 rounded-lg border p-4">
              <Label htmlFor="amount">Amount (INR)</Label>
              <Input id="amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Enter amount" />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void startPayment()} disabled={isInitiating || parsedAmount == null}>
                  {isInitiating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Initiate UPI payment
                </Button>
                <Button variant="outline" onClick={resetToAmountStep} disabled={isInitiating || isConfirming || isCheckingStatus}>
                  Cancel
                </Button>
              </div>
              {parsedAmount == null ? <p className="text-xs text-red-600">Enter a valid positive amount.</p> : null}
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
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void confirmPayment()} disabled={isConfirming || !transactionId || upiPin.length < 4}>
                  {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm & Execute payment
                </Button>
                <Button variant="outline" onClick={backToAmountStep} disabled={isConfirming}>
                  Back
                </Button>
                <Button variant="ghost" onClick={resetToAmountStep} disabled={isConfirming}>
                  Cancel
                </Button>
              </div>
              {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
            </div>
          ) : null}

          {step >= 3 && step <= 4 ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {transactionState === "failed" ? <AlertCircle className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}
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
                  <p>Amount: {formatCurrency(statusPayload.amount, statusPayload.currency)}</p>
                  <p>Reference: {statusPayload.transactionReference}</p>
                  <p>Last update: {new Date(statusPayload.updatedAt).toLocaleString()}</p>
                </div>
              ) : null}

              {transactionState === "pending" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <Clock3 className="h-4 w-4" /> Pending confirmation
                  </div>
                  <p className="text-xs mt-1">Do not close this tab while your bank confirms the transaction.</p>
                </div>
              )}

              {transactionState === "failed" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <XCircle className="h-4 w-4" /> Payment failed
                  </div>
                  <p className="text-xs mt-1">{errorMessage ?? "Payment failed"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={resetToAmountStep}>Retry from amount step</Button>
                    <Button variant="ghost" onClick={backToAmountStep}>Retry PIN</Button>
                  </div>
                </div>
              ) : null}

              {didPollTimeout ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-700 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <RotateCcw className="h-4 w-4" /> Retry status check
                  </div>
                  <p className="text-xs mt-1">We couldn't get final status yet. Retry status sync without re-entering details.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={retryStatusPolling} disabled={isCheckingStatus}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Retry status check
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/payment/runash-pay">Back to RunAsh Pay</Link>
                    </Button>
                  </div>
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
              <p>Amount paid: {formatCurrency(statusPayload.amount, statusPayload.currency)}</p>
              <p>Confirmed at: {new Date(statusPayload.updatedAt).toLocaleString()}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void shareReceipt()} disabled={isSharingReceipt || isDownloadingReceipt}>
                  {isSharingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                  Share Receipt
                </Button>
                <Button variant="outline" onClick={() => void downloadReceipt()} disabled={isDownloadingReceipt || isSharingReceipt}>
                  {isDownloadingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download transaction details
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/payment/runash-pay">Back to RunAsh Pay</Link>
                </Button>
              </div>
              {shareMessage ? <p className="text-xs text-green-700">{shareMessage}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
