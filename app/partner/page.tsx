import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Partner Program | RunAsh",
  description: "Join the RunAsh partner program for go-to-market and technical collaboration.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Partnerships"
      title="Partner with RunAsh"
      intro="Work with us to co-deliver AI outcomes for startups, teams, and enterprises."
      sections={[
        { title: "Go-to-Market", description: "Build joint offers and launch campaigns with clear value positioning." },
        { title: "Technical Enablement", description: "Get onboarding support, architecture guidance, and solution playbooks." },
        { title: "Growth Support", description: "Access co-marketing assets and priority support channels." },
      ]}
      ctaLabel="Apply as a partner"
      ctaHref="/payment/startup"
    />
  )
}
