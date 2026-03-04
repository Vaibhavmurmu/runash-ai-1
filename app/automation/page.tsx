import type { Metadata } from "next"
import { TopLevelModulePage } from "@/components/dashboard/top-level-module-page"

export const metadata: Metadata = {
  title: "Automation Module | RunAsh AI",
  description: "Top-level automation module with focused actions and recent updates.",
}

export default function AutomationPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <TopLevelModulePage
        title="Automation"
        summary="Run and monitor automation execution with a focused operational entry point."
        ctaLabel="Open workflow queue"
        ctaHref="/workflows"
        activityEndpoint="/api/dashboard/activity?limit=5"
        secondaryLinks={[
          { label: "Dashboard alerts", href: "/dashboard/alerts" },
          { label: "Operations analytics", href: "/dashboard/analytics" },
        ]}
      />
    </div>
  )
}
