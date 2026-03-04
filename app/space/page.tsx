import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Space | RunAsh",
  description: "Launch in RunAsh Space for live sessions, demos, and collaborative AI workflows.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Live Experiences"
      title="RunAsh Space"
      intro="A dedicated place for live product demos, co-building, and audience interaction."
      sections={[
        { title: "Live Rooms", description: "Host interactive sessions with teammates, creators, and customers." },
        { title: "Collaboration", description: "Share assets, prompts, and notes in a single working space." },
        { title: "Analytics", description: "Measure session engagement and improve every live experience." },
      ]}
      ctaLabel="Start a live session"
      ctaHref="/live"
    />
  )
}
