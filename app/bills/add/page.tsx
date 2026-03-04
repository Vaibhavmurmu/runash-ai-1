"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useOptionalAuth } from "@/lib/auth/auth-context"
import { BillClient } from "@/lib/services/bill-client"

export default function AddBillPage() {
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedProvider, setSelectedProvider] = useState("")
  const [consumerNumber, setConsumerNumber] = useState("")
  const [nickname, setNickname] = useState("")
  const [isFavorite, setIsFavorite] = useState(false)
  const [isAutopay, setIsAutopay] = useState(false)
  const [autopayLimit, setAutopayLimit] = useState("")
  const [reminderDays, setReminderDays] = useState("3")
  const [loading, setLoading] = useState(false)
  const [fetchedBill, setFetchedBill] = useState<any>(null)

  const { user } = useOptionalAuth()
  const router = useRouter()

  useEffect(() => {
    void loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      void loadProviders(selectedCategory)
    }
  }, [selectedCategory])

  const loadCategories = async () => {
    try {
      const { data, error } = await BillClient.getBillCategories()
      if (error) toast.error("Failed to load categories")
      else setCategories(data || [])
    } catch {
      toast.error("Failed to load categories")
    }
  }

  const loadProviders = async (categoryId: string) => {
    try {
      const { data, error } = await BillClient.getBillProviders(categoryId)
      if (error) toast.error("Failed to load providers")
      else setProviders(data || [])
    } catch {
      toast.error("Failed to load providers")
    }
  }

  const fetchBillDetails = async () => {
    if (!selectedProvider || !consumerNumber) return
    setLoading(true)
    try {
      const { data, error } = await BillClient.fetchBillDetails(selectedProvider, consumerNumber)
      if (error) toast.error("Failed to fetch bill details")
      else {
        setFetchedBill(data)
        if (data.consumerName && !nickname) setNickname(data.consumerName)
        setStep(3)
      }
    } catch {
      toast.error("Failed to fetch bill details")
    } finally {
      setLoading(false)
    }
  }

  const addBill = async () => {
    if (!user?.id || !selectedProvider || !consumerNumber) return
    setLoading(true)
    try {
      const { error } = await BillClient.addUserBill({
        user_id: user.id,
        provider_id: selectedProvider,
        nickname: nickname || null,
        consumer_number: consumerNumber,
        consumer_name: fetchedBill?.consumerName || null,
        billing_address: fetchedBill?.billingAddress || null,
        is_autopay_enabled: isAutopay,
        autopay_amount_limit: autopayLimit ? Number.parseFloat(autopayLimit) : null,
        reminder_days: Number.parseInt(reminderDays, 10),
        is_favorite: isFavorite,
        last_bill_amount: fetchedBill?.billAmount || null,
        next_due_date: fetchedBill?.dueDate || null,
      } as any)

      if (error) toast.error("Failed to add bill")
      else {
        toast.success("Bill added successfully!")
        router.push("/bills")
      }
    } catch {
      toast.error("Failed to add bill")
    } finally {
      setLoading(false)
    }
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"><div className="max-w-md mx-auto px-6 py-6"><div className="text-center py-20"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10 text-green-600" /></div><h2 className="text-2xl font-bold text-slate-900 mb-2">Bill Added Successfully!</h2><p className="text-slate-600 mb-6">Your bill has been added to your account</p><Link href="/bills"><Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">View My Bills</Button></Link></div></div></div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50"><div className="max-w-md mx-auto px-6 py-4"><div className="flex items-center space-x-4"><Link href="/bills"><Button variant="ghost" size="sm" className="rounded-full"><ArrowLeft className="w-4 h-4" /></Button></Link><h1 className="text-xl font-semibold text-slate-900">Add Bill</h1></div></div></div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-center space-x-2">{[1,2,3].map((i)=><div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i<=step?"bg-blue-600 text-white":"bg-slate-200 text-slate-500"}`}>{i}</div>)}</div>

        {step===1 && <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardHeader><CardTitle className="text-lg">Select Bill Category</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3">{categories.map((c)=><div key={c.id} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedCategory===c.id?"border-blue-500 bg-blue-50":"border-slate-200 hover:border-slate-300"}`} onClick={()=>setSelectedCategory(c.id)}><div className="text-center"><div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2"><span className="text-white text-lg">⚡</span></div><p className="font-medium text-sm">{c.name}</p></div></div>)}</div><Button onClick={()=>setStep(2)} disabled={!selectedCategory} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">Continue</Button></CardContent></Card>}

        {step===2 && <Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardHeader><CardTitle className="text-lg">Select Provider & Enter Details</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="provider">Select Provider</Label><Select value={selectedProvider} onValueChange={setSelectedProvider}><SelectTrigger className="mt-2"><SelectValue placeholder="Choose your service provider" /></SelectTrigger><SelectContent>{providers.map((p)=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="consumerNumber">Consumer Number</Label><Input id="consumerNumber" value={consumerNumber} onChange={(e)=>setConsumerNumber(e.target.value)} placeholder="Enter your consumer number" className="mt-2" /></div><div><Label htmlFor="nickname">Nickname (Optional)</Label><Input id="nickname" value={nickname} onChange={(e)=>setNickname(e.target.value)} placeholder="e.g., Home Electricity" className="mt-2" /></div><Button onClick={fetchBillDetails} disabled={!selectedProvider || !consumerNumber || loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">{loading?"Fetching...":"Fetch Bill Details"}</Button></CardContent></Card>}

        {step===3 && <div className="space-y-6"><Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardHeader><CardTitle className="text-lg">Bill Details</CardTitle></CardHeader><CardContent>{fetchedBill && <div className="bg-slate-50 rounded-lg p-4 space-y-2"><div className="flex justify-between"><span className="text-slate-600">Consumer Name:</span><span className="font-medium">{fetchedBill.consumerName}</span></div><div className="flex justify-between"><span className="text-slate-600">Bill Amount:</span><span className="font-medium">₹{fetchedBill.billAmount}</span></div></div>}</CardContent></Card><Card className="border-slate-200/50 bg-white/80 backdrop-blur-sm"><CardHeader><CardTitle className="text-lg">Bill Settings</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><p className="font-medium">Add to Favorites</p></div><Switch checked={isFavorite} onCheckedChange={setIsFavorite} /></div><div className="flex items-center justify-between"><div><p className="font-medium">Enable AutoPay</p></div><Switch checked={isAutopay} onCheckedChange={setIsAutopay} /></div>{isAutopay && <div><Label htmlFor="autopayLimit">AutoPay Limit</Label><Input id="autopayLimit" type="number" value={autopayLimit} onChange={(e)=>setAutopayLimit(e.target.value)} className="mt-2" /></div>}<div><Label htmlFor="reminderDays">Reminder Days</Label><Select value={reminderDays} onValueChange={setReminderDays}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 day before</SelectItem><SelectItem value="3">3 days before</SelectItem><SelectItem value="5">5 days before</SelectItem><SelectItem value="7">7 days before</SelectItem></SelectContent></Select></div><Button onClick={addBill} disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">{loading?"Adding Bill...":"Add Bill"}</Button></CardContent></Card></div>}
      </div>
    </div>
  )
}
