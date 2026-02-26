import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ClientList } from "@/components/client-list"
import { VendorList } from "@/components/vendor-list"
import { Download, Plus, Search } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Clients & Vendors",
  description: "Manage your business relationships.",
  path: "/dashboard/accounting/clients",
})

export default function ClientsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Clients & Vendors" text="Manage your business relationships." className="mb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" /><span>Export</span></Button>
          <Link href="/dashboard/accounting/clients/add"><Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Plus className="h-3.5 w-3.5" /><span>New Client</span></Button></Link>
        </div>
      </DashboardHeader>
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList><TabsTrigger value="clients">Clients</TabsTrigger><TabsTrigger value="vendors">Vendors</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger><TabsTrigger value="statements">Statements</TabsTrigger></TabsList>
        <TabsContent value="clients" className="space-y-4">
          <div className="relative w-full max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search clients..." className="pl-8 w-full" /></div>
          <Card><CardHeader><CardTitle>Client List</CardTitle><CardDescription>Manage your clients and their information</CardDescription></CardHeader><CardContent><ClientList /></CardContent></Card>
        </TabsContent>
        <TabsContent value="vendors" className="space-y-4"><Card><CardHeader><CardTitle>Vendor List</CardTitle><CardDescription>Manage your vendors and their information</CardDescription></CardHeader><CardContent><VendorList /></CardContent></Card></TabsContent>
        <TabsContent value="groups"><Card><CardHeader><CardTitle>Client & Vendor Groups</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Group Name</TableHead><TableHead>Type</TableHead><TableHead>Members</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Regular Customers</TableCell><TableCell>Client</TableCell><TableCell>42</TableCell></TableRow></TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="statements"><Card><CardHeader><CardTitle>Client Statements</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Generate and send statements to clients.</p></CardContent></Card></TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
