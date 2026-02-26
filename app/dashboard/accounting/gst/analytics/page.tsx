import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard-shell"
import { GstRateDistribution } from "@/components/gst-rate-distribution"
import { GstComplianceScore } from "@/components/gst-compliance-score"
import { GstTrendAnalysis } from "@/components/gst-trend-analysis"
import { GstFilingCalendar } from "@/components/gst-filing-calendar"
import { GstMismatchAnalysis } from "@/components/gst-mismatch-analysis"
import { createDashboardMetadata } from "../../../metadata"

export const metadata: Metadata = createDashboardMetadata({
  title: "GST Analytics",
  description: "Comprehensive analytics and insights for your GST data.",
  path: "/dashboard/accounting/gst/analytics",
})

export default function GstAnalyticsPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive analytics and insights for your GST data</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <GstComplianceScore />
          <GstRateDistribution />
        </div>
        <GstTrendAnalysis />
        <div className="grid gap-6 md:grid-cols-2">
          <GstFilingCalendar />
          <GstMismatchAnalysis />
        </div>
      </div>
    </DashboardShell>
  )
}
