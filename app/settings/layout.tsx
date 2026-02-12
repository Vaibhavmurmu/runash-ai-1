import type React from "react"
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-50/20 dark:to-orange-950/20">
      <DashboardNavigation />
      <div className="md:pl-64">{children}</div>
    </div>
  )
}
