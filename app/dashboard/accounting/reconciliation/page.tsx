import type { Metadata } from "next"
import { Download, FileUp, RefreshCw, Upload } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = createDashboardMetadata({
  title: "GST Reconciliation",
  description: "Match purchase records with GSTR-2A/2B data.",
  path: "/dashboard/accounting/reconciliation",
})

export default function ReconciliationPage() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">GST Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match purchase records with GSTR-2A/2B data from GST portal.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1"><Download className="h-3.5 w-3.5" />Export</Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400"><Upload className="h-3.5 w-3.5" />Import GSTR-2B</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Reconciliation Settings</CardTitle><CardDescription>Configure your reconciliation parameters</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tax-period">Tax Period</Label>
            <Select defaultValue="apr-2025"><SelectTrigger id="tax-period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apr-2025">April 2025</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gstr-file">GSTR-2B JSON File</Label>
            <div className="flex gap-2"><Input id="gstr-file" type="file" className="flex-1" /><Button variant="outline" size="icon"><FileUp className="h-4 w-4" /></Button></div>
          </div>
          <div className="flex items-end"><Button className="w-full bg-gradient-to-r from-orange-600 to-orange-400"><RefreshCw className="mr-2 h-4 w-4" />Run Reconciliation</Button></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="mismatched">Mismatched</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card><CardHeader><CardTitle>All Invoices</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader><TableBody>
              <TableRow><TableCell>INV-1024</TableCell><TableCell>Matched</TableCell><TableCell className="text-right">₹3,240.00</TableCell></TableRow>
              <TableRow><TableCell>INV-1025</TableCell><TableCell>Mismatched</TableCell><TableCell className="text-right">₹1,800.00</TableCell></TableRow>
            </TableBody></Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="mismatched">
          <Card><CardHeader><CardTitle>Mismatched Invoices</CardTitle></CardHeader><CardContent>
            <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Book Tax</TableHead><TableHead>GSTR-2B Tax</TableHead><TableHead className="text-right">Variance</TableHead></TableRow></TableHeader><TableBody>
              <TableRow><TableCell>INV-1025</TableCell><TableCell>₹1,800.00</TableCell><TableCell>₹1,620.00</TableCell><TableCell className="text-right">₹180.00</TableCell></TableRow>
            </TableBody></Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
