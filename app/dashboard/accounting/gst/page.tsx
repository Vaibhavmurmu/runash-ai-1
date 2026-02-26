import type { Metadata } from "next"
import { Download, FileText, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { GstFilingStatus } from "@/components/gst-filing-status"
import { GstReturns } from "@/components/gst-returns"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "GST Management",
  description: "Manage your GST returns, invoices, and compliance.",
  path: "/dashboard/accounting/gst",
})

export default function GstPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="GST Management" text="Manage your GST returns, invoices, and compliance." className="mb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" /><span>Export</span></Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Plus className="h-3.5 w-3.5" /><span>New Return</span></Button>
        </div>
      </DashboardHeader>

      <Tabs defaultValue="returns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="returns">GST Returns</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="e-way">E-Way Bills</TabsTrigger>
        </TabsList>
        <TabsContent value="returns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle>GSTR-1</CardTitle><CardDescription>Outward supplies</CardDescription></CardHeader><CardContent className="text-sm">Due: 11th May 2025 · Status: Pending</CardContent><CardFooter><Button className="w-full bg-gradient-to-r from-orange-600 to-orange-400">File Now</Button></CardFooter></Card>
            <Card><CardHeader className="pb-2"><CardTitle>GSTR-3B</CardTitle><CardDescription>Monthly summary</CardDescription></CardHeader><CardContent className="text-sm">Due: 20th May 2025 · Status: Pending</CardContent><CardFooter><Button className="w-full bg-gradient-to-r from-orange-600 to-orange-400">File Now</Button></CardFooter></Card>
            <Card><CardHeader className="pb-2"><CardTitle>GSTR-9</CardTitle><CardDescription>Annual return</CardDescription></CardHeader><CardContent className="text-sm">Due: 31st Dec 2025 · Status: Not Due</CardContent><CardFooter><Button className="w-full" variant="outline">Prepare</Button></CardFooter></Card>
          </div>
          <Card><CardHeader><CardTitle>Filing History</CardTitle><CardDescription>Your GST return filing history</CardDescription></CardHeader><CardContent><GstReturns /></CardContent></Card>
          <Card><CardHeader><CardTitle>GST Compliance Status</CardTitle><CardDescription>Your current compliance status</CardDescription></CardHeader><CardContent><GstFilingStatus /></CardContent></Card>
        </TabsContent>
        <TabsContent value="invoices"><Card><CardHeader><CardTitle>GST Invoices</CardTitle></CardHeader><CardContent><div className="flex gap-2"><Button variant="outline" size="sm" className="h-8 gap-1"><Upload className="h-3.5 w-3.5" />Import</Button><Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Plus className="h-3.5 w-3.5" />New Invoice</Button></div></CardContent></Card></TabsContent>
        <TabsContent value="reconciliation"><Card><CardHeader><CardTitle>GST Reconciliation</CardTitle></CardHeader><CardContent><FileText className="h-8 w-8 text-muted-foreground" /></CardContent></Card></TabsContent>
        <TabsContent value="e-way"><Card><CardHeader><CardTitle>E-Way Bills</CardTitle></CardHeader><CardContent><FileText className="h-8 w-8 text-muted-foreground" /></CardContent></Card></TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
