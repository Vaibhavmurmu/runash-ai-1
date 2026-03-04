import type { Metadata } from "next"

import { AIAgentsDashboard } from "@/components/ai-agents/ai-agents-dashboard"

export const metadata: Metadata = {
  title: "AI Agents | RunAsh AI Dashboard",
  description: "Create and manage AI agents for automation and live stream operations",
}

export default function AIAgentsPage() {
  return <AIAgentsDashboard />
}
