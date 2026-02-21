import type React from "react"
import type { Metadata } from "next"
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell"
import { DashboardFooter } from "@/components/dashboard/shell/footer"

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
  return <DashboardShell footer={<DashboardFooter />}>{children}</DashboardShell>
}
