import type { Metadata } from "next"

import BrandLandingPage from "@/components/marketing/brand-landing-page"

export const metadata: Metadata = {
  title: "RunAsh Business | Scale Live Commerce",
  description: "Business plans for scaling AI livestreams, automation, and secure payment operations.",
}

export default function BusinessLandingPage() {
  return (
    <BrandLandingPage
      badge="RunAsh Business"
      title="Built for growing teams and enterprises"
      subtitle="Operate high-volume live commerce with advanced controls, secure workflows, and dedicated support."
      sections={[
        {
          title: "Operational reliability",
          description: "Track live performance, stream health, and incident visibility from a single control layer.",
        },
        {
          title: "Business automation",
          description: "Automate alerts, moderation, lead routing, and post-stream reporting for every campaign.",
        },
        {
          title: "Secure billing",
          description: "Manage subscriptions, invoicing, and business checkout operations with auditable flows.",
        },
      ]}
      primaryCta={{ label: "Explore Business Payments", href: "/payment/business" }}
      secondaryCta={{ label: "Book a Demo", href: "/contact-team" }}
    />
  )
}
