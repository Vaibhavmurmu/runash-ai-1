import type { Metadata } from "next"

import BrandLandingPage from "@/components/marketing/brand-landing-page"

export const metadata: Metadata = {
  title: "RunAsh Forms | Request and Feedback",
  description: "Submit implementation requests, enterprise inquiries, and product feedback to RunAsh AI.",
}

export default function FormPage() {
  return (
    <BrandLandingPage
      badge="RunAsh AI Forms"
      title="One place for requests and feedback"
      subtitle="Share project requirements, partnership requests, and support details with a streamlined process."
      sections={[
        {
          title: "Business requests",
          description: "Submit implementation scope, timelines, and integration needs for the RunAsh team.",
        },
        {
          title: "Product feedback",
          description: "Share ideas and pain points so we can improve performance, UX, and delivery speed.",
        },
        {
          title: "Fast routing",
          description: "Your submission is routed to the right team for quicker follow-up and clear ownership.",
        },
      ]}
      primaryCta={{ label: "Contact via Form", href: "/contact" }}
      secondaryCta={{ label: "Support", href: "/support" }}
    />
  )
}
