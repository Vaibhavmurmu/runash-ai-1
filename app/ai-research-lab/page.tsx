import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "AI Research Lab | RunAsh",
  description: "Explore applied AI research, prototypes, and model reliability work at RunAsh.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="AI Research"
      title="AI Research Lab"
      intro="Follow our latest experiments in multimodal systems, evaluation, and production-safe AI delivery."
      sections={[
        { title: "Model Prototyping", description: "We rapidly test new approaches for language, vision, and workflow intelligence." },
        { title: "Reliability", description: "Every research idea is measured against stability, latency, and real-world usefulness." },
        { title: "Open Collaboration", description: "We share practical findings so teams can adopt AI with confidence." },
      ]}
      ctaLabel="Explore research overview"
      ctaHref="/research-overview"
    />
  )
}
