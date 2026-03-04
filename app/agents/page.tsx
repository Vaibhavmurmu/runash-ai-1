import type { Metadata } from "next"

import BrandLandingPage from "@/components/marketing/brand-landing-page"

export const metadata: Metadata = {
  title: "RunAsh AI Agents | Automation for Teams",
  description: "Discover RunAsh AI agents for support, growth, and operations with human-in-the-loop controls.",
}

export default function AgentsLandingPage() {
  return (
    <BrandLandingPage
      badge="RunAsh AI Agents"
      title="AI agents for fast, reliable execution"
      subtitle="Launch production-ready AI agents across customer support, research, and growth workflows."
      sections={[
        {
          title: "Role-based agents",
          description: "Assign specialist agents for moderation, analytics, and content production with clear guardrails.",
        },
        {
          title: "Human approvals",
          description: "Use approval checkpoints before sensitive actions to keep quality, safety, and compliance high.",
        },
        {
          title: "Actionable insights",
          description: "Get real-time summaries, suggested next steps, and measurable performance outcomes.",
        },
      ]}
      primaryCta={{ label: "Open Agent Dashboard", href: "/agents/dashboard" }}
      secondaryCta={{ label: "Contact Team", href: "/contact-team" }}
    />
  )
}
