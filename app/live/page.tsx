import type { Metadata } from "next"

import {
  LiveXComparisonSection,
  LiveXFeatureCards,
  LiveXFinalCtaSection,
  LiveXFooter,
  LiveXHeroSection,
  LiveXTrustStrip,
  LiveXVisualSection,
  LiveXWorkflowSection,
} from "@/components/marketing/livex/livex-sections"

export const metadata: Metadata = {
  title: "RunAsh AI LiveX | AI-Powered Live Commerce",
  description:
    "RunAsh AI LiveX helps teams launch AI-hosted livestream commerce with realtime chat, multilingual voice, overlays, and conversion-ready workflows.",
  openGraph: {
    title: "RunAsh AI LiveX",
    description:
      "Launch conversion-focused live commerce sessions with AI hosts, low-latency interactions, and commerce-safe orchestration.",
    images: [
      {
        url: "/livex/og-livex.svg",
        width: 1200,
        height: 630,
        alt: "RunAsh AI LiveX landing page visual",
      },
    ],
  },
}

export default function LivePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.2),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.18),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
      <div className="relative">
        <LiveXHeroSection />
        <LiveXTrustStrip />
        <LiveXVisualSection />
        <LiveXFeatureCards />
        <LiveXWorkflowSection />
        <LiveXComparisonSection />
        <LiveXFinalCtaSection />
        <LiveXFooter />
      </div>
    </main>
  )
}
