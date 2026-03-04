"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Search,
  Zap,
  Droplets,
  Flame,
  Smartphone,
  Wifi,
  Tv,
  Shield,
  CreditCard,
  Building,
  GraduationCap,
  Clock,
  Star,
  Settings,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useOptionalAuth } from "@/lib/auth/auth-context"
import { BillClient } from "@/lib/services/bill-client"

const iconMap = {
  zap: Zap,
  droplets: Droplets,
  flame: Flame,
  smartphone: Smartphone,
  wifi: Wifi,
  tv: Tv,
  shield: Shield,
  "credit-card": CreditCard,
  building: Building,
  "graduation-cap": GraduationCap,
}

export default function BillsPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [userBills, setUserBills] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const { user } = useOptionalAuth()

  useEffect(() => {
    let active = true

    const loadData = async () => {
      if (!user?.id) {
        if (active) {
          setUserBills([])
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const [categoriesResult, billsResult] = await Promise.all([
          BillClient.getBillCategories(),
          BillClient.getUserBills(user.id),
        ])

        if (!active) return

        if (categoriesResult.error) {
          toast.error("Failed to load categories")
        } else {
          setCategories(categoriesResult.data || [])
        }

        if (billsResult.error) {
          toast.error("Failed to load bills")
        } else {
          setUserBills(billsResult.data || [])
        }
      } catch {
        if (active) {
          toast.error("Failed to load data")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [user?.id])

  const filteredBills = useMemo(
    () =>
      userBills.filter(
        (bill) =>
          bill.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.consumer_number?.includes(searchTerm) ||
          bill.provider?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm, userBills],
  )

  const recentPayments = useMemo(
    () =>
      userBills
        .filter((bill) => bill.last_bill_date)
        .sort((a, b) => new Date(b.last_bill_date).getTime() - new Date(a.last_bill_date).getTime())
        .slice(0, 3),
    [userBills],
  )

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="rounded-full">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-slate-900">Bill Payments</h1>
            </div>
            <Link href="/bills/add">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="w-4 h-4 mr-1" />
                Add Bill
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search bills..." className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {categories.slice(0, 8).map((category) => {
                const IconComponent = iconMap[category.icon as keyof typeof iconMap] || Zap
                return (
                  <Link key={category.id} href={`/bills/category/${category.id}`}>
                    <div className="text-center cursor-pointer group">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-medium text-slate-900 truncate">{category.name}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {recentPayments.length > 0 && (
          <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Payments</CardTitle>
                <Link href="/bills/history">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentPayments.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{bill.nickname || bill.provider?.name}</p>
                      <p className="text-sm text-slate-500">₹{bill.last_bill_amount}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">My Bills</CardTitle>
              <Link href="/bills/manage">
                <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBills.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-4">No bills added yet</p>
                <Link href="/bills/add">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="w-4 h-4 mr-2" />Add Your First Bill
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBills.map((bill) => {
                  const IconComponent = iconMap[bill.provider?.category?.icon as keyof typeof iconMap] || Zap
                  return (
                    <Link key={bill.id} href={`/bills/pay/${bill.id}`}>
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-slate-900">{bill.nickname || bill.provider?.name}</p>
                              {bill.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                            </div>
                            <p className="text-sm text-slate-500">{bill.consumer_number}</p>
                            {bill.next_due_date && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Clock className="w-3 h-3 text-orange-500" />
                                <p className="text-xs text-orange-600">Due: {new Date(bill.next_due_date).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {bill.last_bill_amount && <p className="font-semibold text-slate-900">₹{bill.last_bill_amount}</p>}
                          {bill.is_autopay_enabled && <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">AutoPay</Badge>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
