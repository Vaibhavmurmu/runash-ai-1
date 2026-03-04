"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Clock, Download, Search, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useOptionalAuth } from "@/lib/auth/auth-context"
import { BillClient } from "@/lib/services/bill-client"

export default function BillHistoryPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const { user } = useOptionalAuth()

  useEffect(() => {
    let active = true

    const loadPaymentHistory = async () => {
      if (!user?.id) {
        if (active) {
          setLoading(false)
          setPayments([])
        }
        return
      }

      try {
        const { data, error } = await BillClient.getBillPaymentHistory(user.id)
        if (!active) return
        if (error) {
          toast.error("Failed to load payment history")
        } else {
          setPayments(data || [])
        }
      } catch {
        if (active) toast.error("Failed to load payment history")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPaymentHistory()

    return () => {
      active = false
    }
  }, [user?.id])

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) => {
        const providerName = payment.user_bill?.provider?.name?.toLowerCase() || ""
        const nick = payment.user_bill?.nickname?.toLowerCase() || ""
        const tx = payment.transaction_id?.toLowerCase() || ""

        const matchesSearch =
          providerName.includes(searchTerm.toLowerCase()) ||
          nick.includes(searchTerm.toLowerCase()) ||
          tx.includes(searchTerm.toLowerCase())

        const matchesFilter = filter === "all" || payment.status?.toLowerCase() === filter

        return matchesSearch && matchesFilter
      }),
    [filter, payments, searchTerm],
  )

  const totalPaid = useMemo(
    () => payments.filter((p) => p.status?.toLowerCase() === "success").reduce((sum, p) => sum + (p.total_amount || 0), 0),
    [payments],
  )

  const getStatusIcon = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "success":
        return "bg-green-100 text-green-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200 rounded" />
            <div className="h-48 bg-slate-200 rounded" />
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
            <Link href="/bills">
              <Button variant="ghost" size="sm" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">Payment History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search payments..." className="pl-10" />
            </div>

            <div className="flex space-x-2 overflow-x-auto">
              {["all", "success", "pending", "failed"].map((filterType) => (
                <Button key={filterType} variant={filter === filterType ? "default" : "outline"} size="sm" onClick={() => setFilter(filterType)} className={filter === filterType ? "bg-gradient-to-r from-blue-600 to-purple-600" : ""}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</p><p className="text-xs text-slate-500">Total Paid</p></CardContent></Card>
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-900">{payments.length}</p><p className="text-xs text-slate-500">Total Payments</p></CardContent></Card>
        </div>

        <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Payment History</CardTitle>
              <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPayments.length === 0 ? (
              <div className="text-center py-8"><p className="text-slate-500">No payments found</p></div>
            ) : (
              <div>
                {filteredPayments.map((payment, index) => (
                  <div key={payment.id} className={`p-4 ${index !== filteredPayments.length - 1 ? "border-b border-slate-100" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">{getStatusIcon(payment.status)}</div>
                        <div>
                          <p className="font-medium text-slate-900">{payment.user_bill?.nickname || payment.user_bill?.provider?.name}</p>
                          <p className="text-xs text-slate-500">{payment.user_bill?.consumer_number}</p>
                          <p className="text-xs text-slate-400">{new Date(payment.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">₹{payment.total_amount}</p>
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(payment.status)}`}>{payment.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
