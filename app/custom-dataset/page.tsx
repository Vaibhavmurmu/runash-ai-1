import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Custom Dataset | RunAsh",
  description: "Build custom datasets for your workflows with RunAsh guidance and tooling.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Data Programs"
      title="Custom Dataset"
      intro="Create high-quality datasets tailored to your domain, goals, and compliance needs."
      sections={[
        { title: "Collection", description: "Capture structured inputs from your operations and customer touchpoints." },
        { title: "Curation", description: "Filter, label, and standardize data for consistent model behavior." },
        { title: "Iteration", description: "Continuously refine datasets using feedback loops and evaluation signals." },
      ]}
      ctaLabel="Talk to data team"
      ctaHref="/contact-team"
    />
  )
}
