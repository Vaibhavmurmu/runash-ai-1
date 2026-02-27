import type { Metadata } from "next"
import { TopLevelModulePage } from "@/components/dashboard/top-level-module-page"

export const metadata: Metadata = {
  title: "Dashboard Module | RunAsh AI",
  description: "Top-level dashboard module with streamlined summary, CTA, and recent activity.",
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <TopLevelModulePage
        title="Dashboard"
        summary="Monitor workspace health and quickly launch your core dashboard journey."
        ctaLabel="Open streaming studio"
        ctaHref="/dashboard/streaming-studio"
        secondaryLinks={[
          { label: "Analytics", href: "/dashboard/analytics" },
          { label: "Alerts", href: "/dashboard/alerts" },
          { label: "Settings", href: "/dashboard/settings" },
        ]}
      />
    </div>
  )
}
