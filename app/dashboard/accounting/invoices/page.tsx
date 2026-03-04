import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { InvoiceList } from "@/components/invoice-list"
import { FileText, Plus, Upload } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Invoices",
  description: "Create and manage GST-compliant invoices.",
  path: "/dashboard/accounting/invoices",
})

export default function InvoicesPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Invoices" text="Create and manage your GST-compliant invoices." className="mb-8">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
          </Button>
          <Link href="/dashboard/accounting/invoices/create">
            <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400">
              <Plus className="h-3.5 w-3.5" />
              <span>New Invoice</span>
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Invoices</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Invoices</TabsTrigger>
          <TabsTrigger value="credit">Credit Notes</TabsTrigger>
          <TabsTrigger value="debit">Debit Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Invoices</CardTitle>
              <CardDescription>Manage your outward supplies</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceList type="sales" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="purchase" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Invoices</CardTitle>
              <CardDescription>Manage your inward supplies</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceList type="purchase" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="credit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Credit Notes</CardTitle>
                  <CardDescription>Manage your credit notes</CardDescription>
                </div>
                <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Credit Note</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium mb-2">No credit notes yet</h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="debit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Debit Notes</CardTitle>
                  <CardDescription>Manage your debit notes</CardDescription>
                </div>
                <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Debit Note</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-medium mb-2">No debit notes yet</h3>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
