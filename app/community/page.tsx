import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Community | RunAsh",
  description: "Join the RunAsh community to connect, learn, and build together.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Community"
      title="RunAsh Community"
      intro="Connect with builders, share experiments, and grow with other RunAsh teams."
      sections={[
        { title: "Forum", description: "Ask questions and share solutions in focused discussion spaces." },
        { title: "Events", description: "Join livestreams, office hours, and release briefings." },
        { title: "Programs", description: "Participate in ambassador and referral initiatives." },
      ]}
      ctaLabel="Join the forum"
      ctaHref="/forum"
    />
  )
}
