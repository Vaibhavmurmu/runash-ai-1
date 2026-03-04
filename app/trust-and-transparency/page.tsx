import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Trust & Transparency | RunAsh",
  description: "Learn how RunAsh approaches transparency, governance, and responsible AI.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Trust"
      title="Trust and Transparency"
      intro="Our commitments around safety, clarity, and accountability in AI product delivery."
      sections={[
        { title: "Policy Clarity", description: "We publish clear guidance on model behavior and platform controls." },
        { title: "Operational Transparency", description: "Status updates and change communication are built into our process." },
        { title: "Responsible Delivery", description: "We balance innovation speed with reliability and user trust." },
      ]}
      ctaLabel="Read safety approach"
      ctaHref="/safety-approach"
    />
  )
}
