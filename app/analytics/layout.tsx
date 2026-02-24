import type React from "react"
import { DashboardFooter } from "@/components/dashboard/dashboard-shell-footer"
import { DashboardLayoutFrame } from "@/components/dashboard/dashboard-layout-frame"
import { AnalyticsHeader } from "@/components/analytics/analytics-header"

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayoutFrame
      header={<AnalyticsHeader />}
      footer={<DashboardFooter />}
      contentClassName="mx-auto flex w-full max-w-7xl flex-1 p-4 md:p-6 lg:p-8"
    >
      {children}
    </DashboardLayoutFrame>
  )
}
