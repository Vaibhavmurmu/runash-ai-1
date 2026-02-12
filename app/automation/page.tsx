import type { Metadata } from "next"
import { AutomationDashboard } from "@/components/automation/automation-dashboard"

export const metadata: Metadata = {
  title: "Automation Workflows | RunAsh AI Dashboard",
  description: "Create and manage automation workflows for your live streaming business",
}

export default function AutomationPage() {
  return <AutomationDashboard />
}
