"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Contact, CreditCard, Send, Smartphone, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/auth-context"

type FlowStep = "details" | "confirm" | "processing" | "success" | "failed"
type PaymentMethod = "upi" | "mobile" | "account"

interface UpiStatusPayload {
  transactionId: string
  amount: number
  currency: string
  status: "initiated" | "pending" | "success" | "failed"
  transactionReference: string
  updatedAt: string
  failedReason?: string
}

const recentContacts = [
  { name: "John Doe", upi: "john@paytm", avatar: "JD" },
  { name: "Sarah Wilson", upi: "sarah@gpay", avatar: "SW" },
  { name: "Mike Johnson", upi: "mike@phonepe", avatar: "MJ" },
  { name: "Emma Davis", upi: "emma@paytm", avatar: "ED" },
]

const METHOD_COPY: Record<PaymentMethod, { label: string; placeholder: string }> = {
  upi: { label: "UPI ID", placeholder: "Enter UPI ID (e.g., user@paytm)" },
  mobile: { label: "Mobile Number", placeholder: "Enter mobile number" },
  account: { label: "Account Number", placeholder: "Enter account number" },
}

function buildIdempotencyKey() {
  return `send-money:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`
}

export default function SendMoneyPage() {
  const { user } = useAuth()
  const [step, setStep] = useState<FlowStep>("details")
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("upi")
  const [pin, setPin] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [transaction, setTransaction] = useState<UpiStatusPayload | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState("")

  const methodCopy = METHOD_COPY[method]
  const parsedAmount = useMemo(() => Number.parseFloat(amount), [amount])
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0

  useEffect(() => {
    if (step !== "processing" || !transaction?.transactionId) {
      return
    }

    let attempts = 0
    let timeoutRef: ReturnType<typeof setTimeout> | null = null
    let isMounted = true

    const poll = async () => {
      try {
        const response = await fetch(`/api/upi/status/${transaction.transactionId}`)
        const data: UpiStatusPayload = await response.json()

        if (!isMounted) {
          return
        }

        if (!response.ok) {
          throw new Error("Unable to verify payment status")
        }

        setTransaction(data)

        if (data.status === "success") {
          setStep("success")
          toast.success("Payment completed successfully!")
          return
        }

        if (data.status === "failed") {
          setStep("failed")
          toast.error(data.failedReason || "Payment failed")
          return
        }

        attempts += 1
        if (attempts < 30) {
          timeoutRef = setTimeout(poll, 1000)
        } else {
          setStep("failed")
          toast.warning("Payment status check timed out")
        }
      } catch {
        if (!isMounted) return
        attempts += 1
        if (attempts < 30) {
          timeoutRef = setTimeout(poll, 1000)
        } else {
          setStep("failed")
          toast.error("Unable to verify payment status")
        }
      }
    }

    timeoutRef = setTimeout(poll, 500)

    return () => {
      isMounted = false
      if (timeoutRef) clearTimeout(timeoutRef)
    }
  }, [step, transaction?.transactionId])

  const handleContinueToConfirm = () => {
    if (!recipient || !isAmountValid) {
      toast.error("Please enter a valid recipient and amount")
      return
    }
    setStep("confirm")
  }

  const handleConfirmPayment = async () => {
    if (!isAmountValid || pin.length < 4 || pin.length > 6) {
      toast.error("Please enter a valid PIN")
      return
    }

    setIsProcessing(true)

    try {
      const requestIdempotencyKey = idempotencyKey || buildIdempotencyKey()
      setIdempotencyKey(requestIdempotencyKey)

      const initiateResponse = await fetch("/api/upi/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": requestIdempotencyKey,
        },
        body: JSON.stringify({
          receiverUpiId: recipient,
          amount: parsedAmount,
          note: `Payment from ${user?.email || "RunAsh user"}`,
          gateway: "razorpay",
          method,
          idempotencyKey: requestIdempotencyKey,
        }),
      })

      const initiated = await initiateResponse.json()
      if (!initiateResponse.ok || !initiated?.transactionId) {
        throw new Error(initiated?.error || "Payment initiation failed")
      }

      const confirmResponse = await fetch("/api/upi/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": requestIdempotencyKey,
        },
        body: JSON.stringify({
          transactionId: initiated.transactionId,
          pin,
          idempotencyKey: requestIdempotencyKey,
        }),
      })

      const confirmed = await confirmResponse.json()
      if (!confirmResponse.ok || !confirmed?.ok) {
        throw new Error(confirmed?.error || "Payment confirmation failed")
      }

      setTransaction({
        transactionId: confirmed.transactionId,
        amount: parsedAmount,
        currency: "INR",
        status: confirmed.status,
        transactionReference: confirmed.transactionReference,
        updatedAt: confirmed.updatedAt,
      })
      setStep("processing")
      toast.success("Payment initiated. Verifying final status…")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Payment failed"
      setStep("failed")
      toast.error(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetFlow = () => {
    setStep("details")
    setPin("")
    setTransaction(null)
    setIdempotencyKey("")
  }

  if (step === "success" && transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-2">
              ₹{parsedAmount.toFixed(2)} sent to {recipient}
            </p>
            <p className="text-xs text-slate-500 mb-6">Ref: {transaction.transactionReference}</p>
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Back to Home</Button>
              </Link>
              <Link href={`/api/upi/transactions/${transaction.transactionId}`}>
                <Button variant="outline" className="w-full bg-transparent">
                  View Transaction Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Unsuccessful</h2>
            <p className="text-slate-600 mb-6">Please retry the payment. No duplicate charge will be created for this request.</p>
            <div className="space-y-3">
              <Button onClick={resetFlow} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                Try Again
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">
              {step === "processing" ? "Processing Payment" : step === "confirm" ? "Confirm Payment" : "Send Money"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {step === "details" && (
          <>
            <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Choose Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    method === "upi" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                  onClick={() => setMethod("upi")}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">UPI ID</p>
                      <p className="text-sm text-slate-500">Send using UPI ID</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    method === "mobile" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                  onClick={() => setMethod("mobile")}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Contact className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Mobile Number</p>
                      <p className="text-sm text-slate-500">Send using mobile number</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    method === "account" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                  onClick={() => setMethod("account")}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Account Number</p>
                      <p className="text-sm text-slate-500">Send using account details</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {recentContacts.map((contact) => (
                    <div key={contact.upi} className="text-center cursor-pointer" onClick={() => setRecipient(contact.upi)}>
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-medium text-sm">{contact.avatar}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 truncate">{contact.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="recipient">{methodCopy.label}</Label>
                  <Input
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={methodCopy.placeholder}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-8"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleContinueToConfirm}
                  disabled={!recipient || !isAmountValid || isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {step === "confirm" && (
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Confirm Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">To:</span>
                  <span className="font-medium">{recipient}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold text-xl">₹{parsedAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="pin">Enter UPI PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-6 digit PIN"
                  maxLength={6}
                  className="mt-2 text-center text-lg tracking-widest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="bg-transparent" onClick={() => setStep("details")}>
                  Back
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={pin.length < 4 || isProcessing}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-12"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isProcessing ? "Processing..." : `Send ₹${parsedAmount.toFixed(2)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "processing" && transaction && (
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Finalizing transfer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-700">We are confirming your payment with the provider. Please wait…</p>
              <p className="text-xs text-slate-500">Transaction: {transaction.transactionId}</p>
              <p className="text-xs text-slate-500">Reference: {transaction.transactionReference}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
