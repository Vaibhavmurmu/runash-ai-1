import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { createDashboardMetadata } from "../../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Add New Client",
  description: "Create a new client record.",
  path: "/dashboard/accounting/clients/add",
})

export default function AddClientPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Add New Client" text="Create a new client record." className="mb-8">
        <Link href="/dashboard/accounting/clients"><Button variant="outline" size="sm" className="h-8 gap-1"><ArrowLeft className="h-3.5 w-3.5" /><span>Back</span></Button></Link>
      </DashboardHeader>
      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="basic">Basic Information</TabsTrigger><TabsTrigger value="contact">Contact Details</TabsTrigger><TabsTrigger value="billing">Billing Information</TabsTrigger><TabsTrigger value="additional">Additional Details</TabsTrigger></TabsList>
        <TabsContent value="basic"><Card><CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Enter the client's basic details</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="client-name">Client Name</Label><Input id="client-name" placeholder="Enter client name" /></div><div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" placeholder="Enter a brief description" /></div></CardContent><CardFooter className="flex justify-end"><Button className="bg-gradient-to-r from-orange-600 to-orange-400">Continue</Button></CardFooter></Card></TabsContent>
        <TabsContent value="contact"><Card><CardHeader><CardTitle>Contact Details</CardTitle></CardHeader><CardContent className="space-y-2"><Input placeholder="Email" /><Input placeholder="Phone" /></CardContent></Card></TabsContent>
        <TabsContent value="billing"><Card><CardHeader><CardTitle>Billing Information</CardTitle></CardHeader><CardContent className="space-y-2"><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" /><Select><SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger><SelectContent><SelectItem value="inr">INR</SelectItem><SelectItem value="usd">USD</SelectItem></SelectContent></Select></CardContent></Card></TabsContent>
        <TabsContent value="additional"><Card><CardHeader><CardTitle>Additional Details</CardTitle></CardHeader><CardContent><Textarea placeholder="Notes" className="min-h-[100px]" /></CardContent><CardFooter className="flex justify-between"><Button variant="outline">Cancel</Button><Button className="bg-gradient-to-r from-orange-600 to-orange-400"><Save className="mr-2 h-4 w-4" />Save Client</Button></CardFooter></Card></TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
