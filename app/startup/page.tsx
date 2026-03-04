import type { Metadata } from "next"

import BrandLandingPage from "@/components/marketing/brand-landing-page"

export const metadata: Metadata = {
  title: "RunAsh Startup | Launch Faster with AI",
  description: "Startup-friendly RunAsh AI plans for launching live commerce, growth experiments, and product feedback loops.",
}

export default function StartupLandingPage() {
  return (
    <BrandLandingPage
      badge="RunAsh Startup"
      title="Move fast from idea to live market"
      subtitle="Launch campaigns, validate demand, and automate repetitive tasks with startup-ready RunAsh tools."
      sections={[
        {
          title: "Quick go-live",
          description: "Start livestream and AI workflows quickly with low setup complexity and practical defaults.",
        },
        {
          title: "Lean experimentation",
          description: "Test offers, collect audience signals, and iterate with measurable conversion data.",
        },
        {
          title: "Simple pricing path",
          description: "Upgrade from startup plans to business plans as your traffic and team grow.",
        },
      ]}
      primaryCta={{ label: "View Startup Plan", href: "/payment/startup" }}
      secondaryCta={{ label: "Get Started", href: "/get-started" }}
    />
  )
}
