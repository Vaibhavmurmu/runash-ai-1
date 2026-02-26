import type { Metadata } from "next"
import { Download, Plus, Search } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = createDashboardMetadata({
  title: "Ledger",
  description: "Manage chart of accounts and ledger entries.",
  path: "/dashboard/accounting/ledger",
})

export default function LedgerPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ledger</h1>
          <p className="text-sm text-muted-foreground">Manage your accounts and ledger entries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Plus className="h-3.5 w-3.5" />New Account</Button>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="entries">Ledger Entries</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="space-y-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search accounts..." className="pl-8 w-full" />
          </div>
          <Card><CardHeader><CardTitle>Chart of Accounts</CardTitle><CardDescription>Manage your accounting structure</CardDescription></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>1001</TableCell><TableCell>Cash in Hand</TableCell><TableCell>Asset</TableCell><TableCell className="text-right">₹25,000.00</TableCell></TableRow>
                <TableRow><TableCell>3001</TableCell><TableCell>Accounts Payable</TableCell><TableCell>Liability</TableCell><TableCell className="text-right">₹32,000.00</TableCell></TableRow>
                <TableRow><TableCell>7001</TableCell><TableCell>GST Payable</TableCell><TableCell>Liability</TableCell><TableCell className="text-right">₹18,000.00</TableCell></TableRow>
              </TableBody></Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="entries">
          <Card><CardHeader><CardTitle>Ledger Entries</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Voucher</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>01/05/2025</TableCell><TableCell>JV-001</TableCell><TableCell>Bank Account</TableCell><TableCell className="text-right">1,00,000.00</TableCell><TableCell className="text-right">-</TableCell></TableRow>
                <TableRow><TableCell>01/05/2025</TableCell><TableCell>JV-001</TableCell><TableCell>Capital Account</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right">1,00,000.00</TableCell></TableRow>
              </TableBody></Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="trial">
          <Card><CardHeader><CardTitle>Trial Balance</CardTitle><CardDescription>As of May 9, 2025</CardDescription></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>Bank Account</TableCell><TableCell className="text-right">1,75,000.00</TableCell><TableCell className="text-right">-</TableCell></TableRow>
                <TableRow><TableCell>Sales Revenue</TableCell><TableCell className="text-right">-</TableCell><TableCell className="text-right">1,20,000.00</TableCell></TableRow>
                <TableRow className="font-bold"><TableCell>Total</TableCell><TableCell className="text-right">3,47,600.00</TableCell><TableCell className="text-right">2,70,000.00</TableCell></TableRow>
              </TableBody></Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
