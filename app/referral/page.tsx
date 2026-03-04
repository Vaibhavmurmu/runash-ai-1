import type { Metadata } from "next"
import { SimplePage } from "@/components/marketing/simple-page"

export const metadata: Metadata = {
  title: "Referral Program | RunAsh",
  description: "Share RunAsh and earn referral rewards through our program.",
}

export default function Page() {
  return (
    <SimplePage
      eyebrow="Growth"
      title="Referral Program"
      intro="Invite your network, unlock rewards, and help more teams adopt RunAsh."
      sections={[
        { title: "Simple Sharing", description: "Use personalized referral links to invite new users quickly." },
        { title: "Transparent Rewards", description: "Track progress and payouts with clear milestones." },
        { title: "Built for Teams", description: "Make referrals part of your community or partner growth motion." },
      ]}
      ctaLabel="Start referring"
      ctaHref="/settings/refer"
    />
  )
}
