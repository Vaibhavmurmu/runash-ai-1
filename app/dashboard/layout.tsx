import type React from "react"
import type { Metadata } from "next"
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation"

export const metadata: Metadata = {
  title: {
    default: "Dashboard | RunAsh AI",
    template: "%s | RunAsh AI Dashboard",
  },
  description: "RunAsh AI dashboard for workspace control, analytics insights, automation workflows, and AI agent operations.",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-50/20 dark:to-orange-950/20">
      <DashboardNavigation />
      <div className="md:pl-64">{children}</div>
    </div>
  )
}
