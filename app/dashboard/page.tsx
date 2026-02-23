import type { Metadata } from "next"
import { EnhancedDashboard } from "@/components/dashboard/enhanced-dashboard"
import { StreamQuickAccess } from "@/components/dashboard/stream-quick-access"

export const metadata: Metadata = {
  title: "Dashboard Workspace | RunAsh AI",
  description:
    "Access your RunAsh AI workspace with dashboard insights and quick access links for core product surfaces.",
  alternates: {
    canonical: "/dashboard",
  },
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto grid gap-6 p-4 md:p-6 lg:grid-cols-4 lg:p-8">
      <div className="lg:col-span-3">
        <EnhancedDashboard />
      </div>
      <div>
        <StreamQuickAccess />
      </div>
    </div>
  )
}
