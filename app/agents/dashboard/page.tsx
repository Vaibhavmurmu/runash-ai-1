import type { Metadata } from "next"
import { TopLevelModulePage } from "@/components/dashboard/top-level-module-page"

export const metadata: Metadata = {
  title: "Agents Module | RunAsh AI",
  description: "Top-level AI agents module with streamlined navigation and activity.",
}

export default function AgentsDashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <TopLevelModulePage
        title="Agents"
        summary="Coordinate assistant agents, session handoffs, and operator copilots from one place."
        ctaLabel="Open AI agents workspace"
        ctaHref="/ai-agents"
        secondaryLinks={[
          { label: "RunAsh Chat", href: "/runashchat" },
          { label: "Agent feedback", href: "/dashboard/feedback" },
        ]}
      />
    </div>
  )
}
