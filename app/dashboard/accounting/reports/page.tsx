import type { Metadata } from "next"
import { Download, Printer } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = createDashboardMetadata({
  title: "Financial Reports",
  description: "Generate and view accounting and GST statements.",
  path: "/dashboard/accounting/reports",
})

export default function ReportsPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and view your financial statements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Printer className="h-3.5 w-3.5" />Print</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Financial Year 2024-25</div>
        <Select defaultValue="may"><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="may">May 2025</SelectItem><SelectItem value="q1">Q1 (Apr-Jun 2025)</SelectItem><SelectItem value="fy">Full Year 2024-25</SelectItem>
        </SelectContent></Select>
      </div>

      <Tabs defaultValue="balance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
          <TabsTrigger value="cash">Cash Flow</TabsTrigger>
          <TabsTrigger value="gst">GST Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="balance"><Card><CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader><CardContent className="text-sm">Assets: ₹2,45,000.00 · Liabilities: ₹50,000.00 · Equity: ₹1,95,000.00</CardContent></Card></TabsContent>
        <TabsContent value="profit"><Card><CardHeader><CardTitle>Profit & Loss</CardTitle></CardHeader><CardContent className="text-sm">Revenue: ₹1,20,000.00 · Expenses: ₹90,000.00 · Net Profit: ₹30,000.00</CardContent></Card></TabsContent>
        <TabsContent value="cash"><Card><CardHeader><CardTitle>Cash Flow</CardTitle></CardHeader><CardContent className="text-sm">Operating: ₹20,000.00 · Investing: -₹5,000.00 · Financing: ₹10,000.00</CardContent></Card></TabsContent>
        <TabsContent value="gst" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>GSTR-3B Summary</CardTitle><CardDescription>Tax liability snapshot</CardDescription></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>
                <TableRow><TableCell>Output Tax</TableCell><TableCell className="text-right">₹18,000.00</TableCell></TableRow>
                <TableRow><TableCell>Input Tax Credit</TableCell><TableCell className="text-right">₹12,600.00</TableCell></TableRow>
                <TableRow><TableCell>Net Tax Payable</TableCell><TableCell className="text-right">₹5,400.00</TableCell></TableRow>
              </TableBody></Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
