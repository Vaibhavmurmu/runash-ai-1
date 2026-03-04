import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Ambassador Program | RunAsh",
  description: "Become a RunAsh ambassador and help grow the builder community.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Community Programs"
      title="Ambassador Program"
      intro="Represent RunAsh, host local activations, and mentor new builders."
      sections={[
        { title: "Leadership", description: "Lead conversations that help people adopt AI responsibly." },
        { title: "Events", description: "Run workshops, meetups, and demo sessions with our support." },
        { title: "Recognition", description: "Get featured opportunities and early access to platform updates." },
      ]}
      ctaLabel="Join ambassadors"
      ctaHref="/community"
    />
  )
}
