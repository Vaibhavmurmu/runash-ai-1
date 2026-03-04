import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Learn | RunAsh",
  description: "Learn AI product workflows with RunAsh tutorials and guides.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Resources"
      title="Learn with RunAsh"
      intro="A practical learning destination with tutorials, examples, and implementation guides."
      sections={[
        { title: "Quickstarts", description: "Get started quickly with step-by-step project walkthroughs." },
        { title: "Playbooks", description: "Use reusable templates for common AI workflow patterns." },
        { title: "Support", description: "Find troubleshooting help and community Q&A." },
      ]}
      ctaLabel="Visit education"
      ctaHref="/education"
    />
  )
}
