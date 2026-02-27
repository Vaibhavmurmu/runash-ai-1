import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Research | RunAsh",
  description: "Browse RunAsh research tracks, publications, and practical insights.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Research Hub"
      title="Research"
      intro="Discover our core research areas and how they translate into product experiences."
      sections={[
        { title: "Programs", description: "Track current initiatives across model safety, quality, and performance." },
        { title: "Publications", description: "Read short papers and technical notes from the team." },
        { title: "Community", description: "Join practitioners and contributors building with RunAsh." },
      ]}
      ctaLabel="Read latest papers"
      ctaHref="/research-paper"
    />
  )
}
