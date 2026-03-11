import type { Metadata } from "next"
import Link from "next/link"

const coreFeatures = [
  {
    title: "Adaptive Stage Layout",
    description: "Auto-arrange hosts, guests, and product highlights into clean multi-cam scenes for every stream.",
  },
  {
    title: "AI Copilot Prompts",
    description: "Generate talking points, CTAs, and live reactions in real time to keep every session engaging.",
  },
  {
    title: "Commerce-Ready Moments",
    description: "Pin products, limited offers, and conversion cards without interrupting the flow of the show.",
  },
  {
    title: "Reliability Telemetry",
    description: "Track bitrate, latency, and retention signals with proactive recommendations while you broadcast.",
  },
]

const launchSteps = [
  "Design your LiveX room with branded overlays and layout presets.",
  "Invite hosts, moderators, and guests with role-based controls.",
  "Stream everywhere and monitor audience health from one command view.",
]

export const metadata: Metadata = {
  title: "RunAsh AI LiveX | Smart live experiences",
  description:
    "Launch AI-powered live sessions with cinematic layouts, real-time co-pilot guidance, and conversion-focused engagement in RunAsh AI LiveX.",
}

export default function LiveXLandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02060d] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(34,211,238,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(56,189,248,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.24)_1px,transparent_1px)] [background-size:72px_72px]" />

      <section className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16 pt-20 sm:px-10 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mx-auto inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">
            RunAsh AI LiveX
          </p>
          <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">
            Build bold, AI-orchestrated
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent"> live experiences</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            LiveX helps teams stream, sell, and scale interactive shows with cinematic design, AI cueing, and actionable audience
            intelligence.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="rounded-md bg-cyan-400 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300"
            >
              Join beta waitlist
            </Link>
            <Link
              href="/features"
              className="rounded-md border border-slate-500/60 bg-slate-900/60 px-6 py-3 text-sm font-medium uppercase tracking-wider text-slate-200 transition hover:border-cyan-300/70 hover:text-cyan-200"
            >
              Explore capabilities
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-[0_0_60px_rgba(8,145,178,0.08)] md:grid-cols-3">
          {[
            { label: "Session reliability", value: "99.95%" },
            { label: "Avg setup time", value: "8 min" },
            { label: "Engagement lift", value: "+42%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-800/80 bg-[#020914] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-cyan-300">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="grid gap-4 md:grid-cols-2">
          {coreFeatures.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6">
              <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:items-center">
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-400/10 to-sky-500/5 p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Launch in hours</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">From idea to high-converting stream in three steps</h2>
          <ul className="mt-6 space-y-4 text-sm text-slate-200">
            {launchSteps.map((step) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-cyan-300" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Built for modern teams</p>
          <div className="mt-6 space-y-5 text-sm text-slate-300">
            <p>
              LiveX unifies event producers, creators, and commerce operators under one control plane—no plugin juggling, no slow
              handoffs.
            </p>
            <p>
              With native AI recommendations and automated scene management, your team focuses on stories and selling, not
              troubleshooting.
            </p>
          </div>
        </div>
      </section>

      <section className="relative border-t border-slate-800/90 bg-[#020813]">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-14 text-center sm:px-10">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">Ready to launch RunAsh AI LiveX?</h2>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Claim early access and get onboarding support to ship your first intelligent live campaign faster.
          </p>
          <Link
            href="/waitlist"
            className="rounded-md border border-cyan-400 bg-cyan-400/90 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300"
          >
            Reserve my access
          </Link>
        </div>
      </section>
    </main>
  )
}
