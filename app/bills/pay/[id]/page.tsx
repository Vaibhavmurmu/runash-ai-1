"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, RefreshCw, Zap } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOptionalAuth } from "@/lib/auth/auth-context"
import { BillClient } from "@/lib/services/bill-client"

export default function PayBillPage({ params }: { params: { id: string } }) {
  const [bill, setBill] = useState<any>(null)
  const [billDetails, setBillDetails] = useState<any>(null)
  const [amount, setAmount] = useState("")
  const [pin, setPin] = useState("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { user } = useOptionalAuth()

  useEffect(() => {
    void loadBillData()
  }, [params.id, user?.id])

  const loadBillData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const { data: userBills } = await BillClient.getUserBills(user.id)
      const userBill = userBills?.find((b) => b.id === params.id)

      if (userBill) {
        setBill(userBill)
        await fetchCurrentBill(userBill)
      }
    } catch {
      toast.error("Failed to load bill data")
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentBill = async (userBill: any) => {
    try {
      const { data, error } = await BillClient.fetchBillDetails(userBill.provider_id, userBill.consumer_number)
      if (error) {
        toast.error("Failed to fetch current bill")
      } else {
        setBillDetails(data)
        setAmount(String(data.billAmount || ""))
      }
    } catch {
      toast.error("Failed to fetch current bill")
    }
  }

  const handlePayment = async () => {
    if (step === 1 && amount) {
      setStep(2)
      return
    }
    if (step === 2 && pin.length === 4) {
      setProcessing(true)
      try {
        const { error } = await BillClient.payBill({
          userId: user?.id || 'anonymous',
          userBillId: bill?.id,
          billAmount: Number.parseFloat(amount),
          convenienceFee: 2.5,
          paymentMethod: "UPI",
        })

        if (error) {
          toast.error("Payment failed")
        } else {
          toast.success("Payment successful!")
          setStep(3)
        }
      } catch {
        toast.error("Payment failed")
      } finally {
        setProcessing(false)
      }
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"><div className="max-w-md mx-auto px-6 py-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded" /><div className="h-48 bg-slate-200 rounded" /></div></div></div>
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"><div className="max-w-md mx-auto px-6 py-6"><div className="text-center py-20"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-green-600" /></div><h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2><p className="text-slate-600 mb-6">₹{amount} paid for {bill?.nickname || bill?.provider?.name}</p><div className="space-y-3"><Link href="/bills"><Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Back to Bills</Button></Link><Link href="/bills/history"><Button variant="outline" className="w-full bg-transparent">View Payment History</Button></Link></div></div></div></div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50"><div className="max-w-md mx-auto px-6 py-4"><div className="flex items-center space-x-4"><Link href="/bills"><Button variant="ghost" size="sm" className="rounded-full"><ArrowLeft className="w-4 h-4" /></Button></Link><h1 className="text-xl font-semibold text-slate-900">Pay Bill</h1></div></div></div>
      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader><div className="flex items-center space-x-3"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><Zap className="w-6 h-6 text-blue-600" /></div><div><CardTitle className="text-lg">{bill?.nickname || bill?.provider?.name}</CardTitle><p className="text-sm text-slate-500">{bill?.consumer_number}</p></div></div></CardHeader>
          <CardContent>
            {billDetails ? (
              <div className="space-y-3"><div className="bg-slate-50 rounded-lg p-4 space-y-2"><div className="flex justify-between"><span className="text-slate-600">Bill Number:</span><span className="font-medium">{billDetails.billNumber}</span></div><div className="flex justify-between"><span className="text-slate-600">Due Date:</span><span className="font-medium text-orange-600">{new Date(billDetails.dueDate).toLocaleDateString()}</span></div><div className="flex justify-between"><span className="text-slate-600">Amount Due:</span><span className="font-bold text-lg">₹{billDetails.billAmount}</span></div></div><Badge variant="secondary" className={`${new Date(billDetails.dueDate) < new Date() ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{new Date(billDetails.dueDate) < new Date() ? "Overdue" : "Current"}</Badge></div>
            ) : (
              <div className="flex items-center justify-center py-8"><Button variant="outline" onClick={() => fetchCurrentBill(bill)}><RefreshCw className="w-4 h-4 mr-2" />Fetch Bill Details</Button></div>
            )}
          </CardContent>
        </Card>

        {step === 1 && billDetails && (
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardHeader><CardTitle className="text-lg">Payment Amount</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="amount">Amount to Pay</Label><div className="relative mt-2"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">₹</span><Input id="amount" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className="pl-8" /></div></div><div className="bg-slate-50 rounded-lg p-4 space-y-2"><div className="flex justify-between"><span className="text-slate-600">Bill Amount:</span><span>₹{amount}</span></div><div className="flex justify-between"><span className="text-slate-600">Convenience Fee:</span><span>₹2.50</span></div><div className="border-t pt-2 flex justify-between font-semibold"><span>Total Amount:</span><span>₹{(Number.parseFloat(amount || "0") + 2.5).toFixed(2)}</span></div></div><Button onClick={handlePayment} disabled={!amount || Number.parseFloat(amount) <= 0} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Continue to Payment</Button></CardContent></Card>
        )}

        {step === 2 && (
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardHeader><CardTitle className="text-lg">Confirm Payment</CardTitle></CardHeader><CardContent className="space-y-6"><div className="bg-slate-50 rounded-lg p-4"><div className="flex justify-between items-center mb-2"><span className="text-slate-600">Paying to:</span><span className="font-medium">{bill?.provider?.name}</span></div><div className="flex justify-between items-center"><span className="text-slate-600">Total Amount:</span><span className="font-bold text-xl">₹{(Number.parseFloat(amount) + 2.5).toFixed(2)}</span></div></div><div><Label htmlFor="pin">Enter UPI PIN</Label><Input id="pin" type="password" value={pin} onChange={(e)=>setPin(e.target.value)} placeholder="Enter 4-digit PIN" maxLength={4} className="mt-2 text-center text-lg tracking-widest" /></div><Button onClick={handlePayment} disabled={pin.length !== 4 || processing} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 h-12">{processing ? "Processing Payment..." : `Pay ₹${(Number.parseFloat(amount) + 2.5).toFixed(2)}`}</Button></CardContent></Card>
        )}
      </div>
    </div>
  )
}
