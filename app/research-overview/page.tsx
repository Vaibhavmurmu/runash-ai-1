import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Research Overview | RunAsh",
  description: "Review RunAsh research focus areas, execution streams, and milestone tracking.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Insights"
      title="Research Overview"
      intro="See what we are researching now, how each stream maps to product outcomes, and where to access supporting assets."
      sections={[
        {
          title: "Focus Areas",
          description: "Current priorities include multimodal intelligence, model reliability, and safe production deployment.",
        },
        {
          title: "Execution Workflow",
          description: "Ideas move from prototype to measurable releases with documentation, offline evaluation, and staged rollout gates.",
        },
        {
          title: "Platform Integrations",
          description: "Hugging Face, Colab, and Kaggle workflows are used for sharing models, experiments, and benchmark results.",
        },
      ]}
      ctaLabel="Visit the Research Hub"
      ctaHref="/research"
    />
  )
}
