import type { Metadata } from "next"

import BrandLandingPage from "@/components/marketing/brand-landing-page"

export const metadata: Metadata = {
  title: "RunAsh AI Server Error Guidance",
  description: "What to do when you experience a temporary server-side issue on RunAsh AI.",
}

export default function ServerErrorPage() {
  return (
    <BrandLandingPage
      badge="RunAsh Reliability"
      title="Temporary server issue"
      subtitle="Our systems may be updating or handling elevated traffic. Use these quick next steps."
      sections={[
        {
          title: "Retry safely",
          description: "Refresh the page after a short pause. Active sessions and drafts are usually preserved.",
        },
        {
          title: "Check status",
          description: "Review platform health and incident updates to confirm if there is an ongoing issue.",
        },
        {
          title: "Contact support",
          description: "Share issue details, route, and timestamp for faster resolution by our team.",
        },
      ]}
      primaryCta={{ label: "Open Status Page", href: "/status" }}
      secondaryCta={{ label: "Contact Support", href: "/support" }}
    />
  )
}
