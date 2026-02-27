import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ExportOptions } from "@/components/export-options"
import { FileDown, FileSpreadsheet, FileText, FileIcon as FilePdf } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Data Export",
  description: "Export your financial data in various formats.",
  path: "/dashboard/accounting/exports",
})

export default function ExportsPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Data Export" text="Export your financial data in various formats." className="mb-8" />
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="gst">GST Returns</TabsTrigger>
          <TabsTrigger value="ledger">Ledger & Journal</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center"><FilePdf className="mr-2 h-5 w-5 text-orange-500" />Balance Sheet</CardTitle><CardDescription>Export your balance sheet</CardDescription></CardHeader><CardContent><ExportOptions title="Balance Sheet" formats={["pdf", "excel", "csv"]} periodOptions /></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center"><FilePdf className="mr-2 h-5 w-5 text-orange-500" />Profit & Loss</CardTitle><CardDescription>Export your P&L statement</CardDescription></CardHeader><CardContent><ExportOptions title="Profit & Loss" formats={["pdf", "excel", "csv"]} periodOptions /></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="flex items-center"><FileDown className="mr-2 h-5 w-5 text-orange-500" />All Reports</CardTitle><CardDescription>Export all financial reports</CardDescription></CardHeader><CardContent><ExportOptions title="All Financial Reports" formats={["pdf", "excel"]} periodOptions /></CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="invoices" className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-orange-500" />Invoice Exports</CardTitle></CardHeader><CardContent><ExportOptions title="Sales Invoices" formats={["pdf", "excel", "csv"]} periodOptions additionalOptions={["Include line items", "Include payment status"]} /></CardContent></Card></TabsContent>
        <TabsContent value="gst" className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center"><FileSpreadsheet className="mr-2 h-5 w-5 text-orange-500" />GST Exports</CardTitle></CardHeader><CardContent><ExportOptions title="GSTR-1 Data" formats={["excel", "json"]} periodOptions additionalOptions={["Government format", "Summary only"]} /></CardContent></Card></TabsContent>
        <TabsContent value="ledger" className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center"><FileSpreadsheet className="mr-2 h-5 w-5 text-orange-500" />Ledger Exports</CardTitle></CardHeader><CardContent><ExportOptions title="General Ledger" formats={["excel", "csv", "pdf"]} periodOptions additionalOptions={["All accounts", "Select accounts"]} /></CardContent></Card></TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
