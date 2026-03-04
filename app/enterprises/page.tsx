import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Enterprise Solutions | RunAsh",
  description: "Explore enterprise-ready AI solutions from RunAsh with security and scale.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Enterprise"
      title="RunAsh for Enterprises"
      intro="Deploy AI programs with governance, reliability, and cross-functional alignment."
      sections={[
        { title: "Governance", description: "Use clear controls for approvals, roles, and policy-aware execution." },
        { title: "Scale", description: "Support multi-team workflows and high-volume operations without friction." },
        { title: "Security", description: "Adopt enterprise-grade practices across access, monitoring, and audits." },
      ]}
      ctaLabel="Contact enterprise team"
      ctaHref="/payment/business"
    />
  )
}
