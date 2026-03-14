import Image from "next/image"
import Link from "next/link"
import {
  Activity,
  Bot,
  Globe2,
  Layers,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const trustMetrics = [
  { label: "Creator sessions/month", value: "12,000+" },
  { label: "Median interaction latency", value: "< 180ms" },
  { label: "Stream uptime", value: "99.95%" },
]

const features = [
  {
    icon: Bot,
    title: "AI host orchestration",
    copy: "Launch trustworthy hosts that present, answer, and convert in English and Hindi.",
  },
  {
    icon: Globe2,
    title: "Realtime multilingual voice",
    copy: "Keep sessions inclusive with live translation, captions, and fast voice handoff.",
  },
  {
    icon: Layers,
    title: "Interactive commerce overlays",
    copy: "Sync product cards, offers, and checkout prompts directly with live moments.",
  },
  {
    icon: Activity,
    title: "Intent-aware recommendations",
    copy: "Turn chat signals and clicks into dynamic product sequencing during the stream.",
  },
  {
    icon: ShieldCheck,
    title: "Commerce-safe automation",
    copy: "Protect trust with verified pricing flows and resilient payment-ready actions.",
  },
  {
    icon: Zap,
    title: "Clip-ready highlights",
    copy: "Auto-generate social cutdowns and key moments after every conversion spike.",
  },
]

const workflow = [
  {
    step: "1",
    title: "Prepare your live stack",
    copy: "Load catalog, host persona, language defaults, and campaign goals in Streaming Studio.",
  },
  {
    step: "2",
    title: "Go live with AI hosts",
    copy: "Run synchronized video, chat, captions, and offers from one low-latency control plane.",
  },
  {
    step: "3",
    title: "Convert and optimize",
    copy: "Track intent, trigger CTA moments, and convert viewers with seamless checkout handoff.",
  },
]

const benefits = [
  "Run structured live workflows instead of fragmented one-off stream tooling.",
  "Respond faster to buyer questions with grounded commerce-aware AI host responses.",
  "Scale multilingual launches across markets without adding operator overhead.",
  "Turn every session into reusable clips, insights, and repeatable growth loops.",
]

export function LiveXHeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-24">
      <div className="mx-auto max-w-6xl text-center">
        <Badge className="border border-cyan-300/40 bg-cyan-400/10 text-cyan-100">RunAsh AI LiveX</Badge>
        <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          AI-powered live commerce streams that convert in realtime.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">
          LiveX combines AI hosts, synchronized overlays, multilingual voice, and commerce-safe checkout flows so every stream feels electric and measurable.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-cyan-400 text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.5)] hover:bg-cyan-300"
          >
            <Link href="/dashboard/streaming-studio">Open Streaming Studio</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-cyan-300/40 bg-slate-950/40 text-cyan-100 hover:bg-cyan-500/10 hover:text-cyan-50">
            <Link href="#how-it-works">See workflow</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function LiveXTrustStrip() {
  return (
    <section className="px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-4 rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-6 shadow-[inset_0_1px_0_rgba(125,211,252,0.2)] sm:grid-cols-3">
        {trustMetrics.map((metric) => (
          <div key={metric.label} className="text-center sm:text-left">
            <p className="text-3xl font-semibold text-cyan-200">{metric.value}</p>
            <p className="mt-1 text-sm text-slate-300">{metric.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function LiveXVisualSection() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">See your stream intelligence in one control surface.</h2>
          <p className="mt-4 text-slate-300">
            Orchestrate host prompts, live chat, product overlays, and conversion signals from a device-ready dashboard built for fast operator decisions.
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <Image
            src="/livex/device-mockup.svg"
            alt="RunAsh AI LiveX device mockup"
            width={900}
            height={620}
            className="w-full rounded-2xl border border-cyan-300/25 bg-slate-950/80 shadow-[0_0_60px_rgba(34,211,238,0.25)]"
            priority
          />
        </div>
      </div>
    </section>
  )
}

export function LiveXFeatureCards() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Built for high-tempo live commerce teams.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-cyan-300/15 bg-slate-900/70">
              <CardHeader>
                <feature.icon className="h-5 w-5 text-cyan-200" />
                <CardTitle className="pt-2 text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">{feature.copy}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LiveXWorkflowSection() {
  return (
    <section id="how-it-works" className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-cyan-300/20 bg-slate-900/70 p-6">
        <div className="flex items-center gap-2 text-cyan-200">
          <Workflow className="h-5 w-5" />
          <p className="text-sm font-medium uppercase tracking-[0.2em]">How it works</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <div key={item.step} className="rounded-xl border border-cyan-300/15 bg-slate-950/60 p-4">
              <p className="text-sm font-semibold text-cyan-200">Step {item.step}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LiveXComparisonSection() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Image
          src="/livex/hero-visual.svg"
          alt="LiveX neon commerce graph visual"
          width={800}
          height={640}
          className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/80"
        />
        <div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Why teams move from manual streams to LiveX.</h2>
          <ul className="mt-5 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-slate-300">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function LiveXFinalCtaSection() {
  return (
    <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-cyan-500/20 via-slate-900 to-blue-500/20 p-8 text-center">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Launch your next AI-hosted stream with LiveX.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">Keep your headline CTA above the fold and move from planning to live execution in minutes.</p>
        <Button
          asChild
          size="lg"
          className="mt-6 bg-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.45)] hover:bg-cyan-300"
        >
          <Link href="/dashboard/streaming-studio">Start in Streaming Studio</Link>
        </Button>
      </div>
    </section>
  )
}

export function LiveXFooter() {
  return (
    <footer className="border-t border-cyan-300/15 px-4 py-8 text-center text-sm text-slate-400 sm:px-6 lg:px-8">
      <p>© {new Date().getFullYear()} RunAsh AI LiveX. Realtime commerce experiences, safely orchestrated.</p>
    </footer>
  )
}
