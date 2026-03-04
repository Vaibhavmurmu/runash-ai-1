import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TaxCalendar } from "@/components/tax-calendar"
import { TaxSavingOpportunities } from "@/components/tax-saving-opportunities"
import { TaxRateAnalysis } from "@/components/tax-rate-analysis"
import { TaxProjections } from "@/components/tax-projections"
import { Download, FileText } from "lucide-react"
import { createDashboardMetadata } from "../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "Tax Planning",
  description: "Optimize your tax strategy and stay compliant with tax regulations.",
  path: "/dashboard/accounting/tax-planning",
})

export default function TaxPlanningPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Tax Planning"
        text="Optimize your tax strategy and stay compliant with tax regulations."
        className="mb-8"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
          <Button size="sm" className="h-8 gap-1 bg-gradient-to-r from-orange-600 to-orange-400">
            <FileText className="h-3.5 w-3.5" />
            <span>Generate Report</span>
          </Button>
        </div>
      </DashboardHeader>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Tax Calendar</TabsTrigger>
          <TabsTrigger value="savings">Tax Savings</TabsTrigger>
          <TabsTrigger value="analysis">GST Rate Analysis</TabsTrigger>
          <TabsTrigger value="projections">Tax Projections</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Compliance Calendar</CardTitle>
              <CardDescription>Upcoming tax deadlines and compliance requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxCalendar />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="savings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Saving Opportunities</CardTitle>
              <CardDescription>Potential strategies to optimize your tax position</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxSavingOpportunities detailed />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GST Rate Analysis</CardTitle>
              <CardDescription>Analysis of your transactions by GST rate</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxRateAnalysis />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Projections</CardTitle>
              <CardDescription>Estimated tax liability for the current financial year</CardDescription>
            </CardHeader>
            <CardContent>
              <TaxProjections />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
