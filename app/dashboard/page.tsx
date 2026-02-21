import type { Metadata } from "next"
import { DashboardShell } from "./dashboard-shell"

export const metadata: Metadata = {
  title: "Dashboard Workspace | RunAsh AI",
  description:
    "Access your RunAsh AI workspace to manage chat, editor, store, and seller modules with analytics, agents, and automation tools.",
  alternates: {
    canonical: "/dashboard",
  },
}

export default function DashboardPage() {
  return <DashboardShell />
}
