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
      intro="See what we are researching now and how each stream supports long-term platform innovation."
      sections={[
        { title: "Focus Areas", description: "Our priorities include model evaluation, safety alignment, and dataset quality." },
        { title: "Execution", description: "Each stream moves from hypothesis to measurable product impact." },
        { title: "Milestones", description: "Quarterly checkpoints keep research practical and accountable." },
      ]}
      ctaLabel="Visit the Research Hub"
      ctaHref="/research"
    />
  )
}
