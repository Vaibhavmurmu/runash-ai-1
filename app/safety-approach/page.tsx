import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Safety Approach | RunAsh",
  description: "Understand the RunAsh safety approach for AI systems and operations.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Safety"
      title="Safety Approach"
      intro="Safety is integrated from planning through deployment, not added as an afterthought."
      sections={[
        { title: "Pre-release Checks", description: "We evaluate quality, misuse risks, and operational readiness before launch." },
        { title: "Guardrails", description: "Policy controls and monitoring reduce harmful or unstable outcomes." },
        { title: "Continuous Review", description: "Post-release telemetry and feedback help us improve safeguards over time." },
      ]}
      ctaLabel="View trust center"
      ctaHref="/trust-and-transparency"
    />
  )
}
