import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Research Papers | RunAsh",
  description: "Read RunAsh research papers, briefs, and implementation notes.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Publications"
      title="Research Papers"
      intro="A lightweight library of papers and technical summaries from the RunAsh team."
      sections={[
        { title: "Applied AI", description: "Papers focused on production outcomes and measurable user impact." },
        { title: "Safety Notes", description: "Summaries explaining safeguards, testing, and rollout practices." },
        { title: "Implementation Briefs", description: "Practical architecture notes to help teams execute quickly." },
      ]}
      ctaLabel="View research overview"
      ctaHref="/research-overview"
    />
  )
}
