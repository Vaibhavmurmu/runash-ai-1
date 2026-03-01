import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Education | RunAsh",
  description: "Learning resources and education pathways for AI teams on RunAsh.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Learning"
      title="Education"
      intro="Structured pathways for founders, operators, and developers learning with RunAsh."
      sections={[
        { title: "Foundations", description: "Start with practical lessons on product-ready AI workflows." },
        { title: "Hands-on Labs", description: "Practice with guided exercises and implementation examples." },
        { title: "Certifications", description: "Demonstrate skills through project-based checkpoints." },
      ]}
      ctaLabel="Start learning"
      ctaHref="/learn"
    />
  )
}
