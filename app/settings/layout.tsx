import type React from "react"
import { DashboardLayoutFrame } from "@/components/dashboard/dashboard-layout-frame"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutFrame>{children}</DashboardLayoutFrame>
}
