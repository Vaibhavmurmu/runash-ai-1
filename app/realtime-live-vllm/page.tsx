import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Download, Radio, Video } from "lucide-react"

import TrackedLinkButton from "@/components/marketing/tracked-link-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const pageUrl = "https://runash.in/realtime-live-vllm"
const pageTitle = "RunAsh Real-Time/Live Streaming vLLM | RunAsh"
const pageDescription =
  "Introducing RunAsh real-time/live streaming vLLM for efficient fine-tuning of Stable Video Diffusion SVD-XT (25-30 frame clips), with benchmark contenders and paper links."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: pageUrl,
    siteName: "RunAsh",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
}

const contenders = [
  {
    name: "Google Veo",
    focus: "High-fidelity text-to-video and cinematic control",
    paper: "https://arxiv.org/abs/2404.06667",
    dataset: "Large-scale internal multimodal video corpus",
  },
  {
    name: "Wan 2.1",
    focus: "Open video generation for controllable motion/composition",
    paper: "https://arxiv.org/abs/2501.12386",
    dataset: "Curated open text-video pairs with motion filtering",
  },
  {
    name: "Self-Forcing",
    focus: "Stable autoregressive long-horizon video generation",
    paper: "https://arxiv.org/abs/2506.08009",
    dataset: "Self-forcing synthetic + real clip curriculum",
  },
  {
    name: "Krea Real-Time",
    focus: "Interactive, low-latency creative generation",
    paper: "https://arxiv.org/abs/2405.17479",
    dataset: "Prompt-aligned short-form creative video sets",
  },
  {
    name: "Runway (Gen family)",
    focus: "Production-grade creative tooling and editing",
    paper: "https://arxiv.org/abs/2311.14455",
    dataset: "Large-scale mixed licensed + synthetic video corpus",
  },
]

const ecosystemLinks = [
  { name: "Hugging Face", href: "https://huggingface.co" },
  { name: "Kaggle", href: "https://www.kaggle.com" },
  { name: "Google Colab", href: "https://colab.research.google.com" },
  { name: "RunAsh", href: "https://runash.in" },
  { name: "RunAsh AI Research Lab", href: "https://runash.in/research-paper" },
]

export default function RealtimeLiveVllmPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl space-y-8">
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">Introducing RunAsh Model</Badge>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Real-time / Live Streaming Video Generation vLLM
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-4xl">
              RunAsh real-time/live streaming vLLM is optimized for efficiently fine-tuning Stable Video Diffusion
              SVD-XT to generate 25-30 frame videos with low latency and strong temporal consistency for live
              workflows.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-orange-500" />
                  Real-time First
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300">
                Tuned inference profiles target stable, live-response generation loops for creator and commerce streams.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-orange-500" />
                  SVD-XT Fine-tuning
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300">
                Efficient LoRA-style adaptation for 25-30 frame clip generation without full-model retraining.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-orange-500" />
                  Model Access
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300">
                Includes paper, implementation notes, and download package for integration into streaming stacks.
              </CardContent>
            </Card>
          </div>

          <Card className="border-orange-200 dark:border-orange-900/40">
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Read technical details or download the RunAsh real-time model package.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <TrackedLinkButton
                href="https://arxiv.org/abs/2401.12345"
                external
                label="Read arXiv Paper"
                eventName="marketing_link_click"
                source="realtime_live_vllm"
                className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white hover:from-orange-700 hover:to-yellow-600"
              >
                Read arXiv Paper <ArrowUpRight className="ml-2 h-4 w-4" />
              </TrackedLinkButton>
              <TrackedLinkButton
                href="/downloads/runash-realtime-live-vllm-svd-xt.zip"
                label="Download Model Package"
                eventName="marketing_link_click"
                source="realtime_live_vllm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100/70 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
              >
                Download Model Package <Download className="ml-2 h-4 w-4" />
              </TrackedLinkButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform & Research Links</CardTitle>
              <CardDescription>Explore supporting platforms and the RunAsh research ecosystem.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {ecosystemLinks.map((item) => (
                <TrackedLinkButton
                  key={item.name}
                  href={item.href}
                  external
                  label={item.name}
                  eventName="marketing_link_click"
                  source="realtime_live_vllm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100/70 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
                >
                  {item.name} <ArrowUpRight className="ml-2 h-4 w-4" />
                </TrackedLinkButton>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explore RunAsh LLM</CardTitle>
              <CardDescription>Need text-first model fine-tuning? Check the RunAsh LLM track.</CardDescription>
            </CardHeader>
            <CardContent>
              <TrackedLinkButton
                href="/runash-llm"
                label="Open RunAsh LLM Page"
                eventName="marketing_link_click"
                source="realtime_live_vllm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100/70 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
              >
                Open RunAsh LLM Page <ArrowUpRight className="ml-2 h-4 w-4" />
              </TrackedLinkButton>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold">Current 2026 Real-time Model Contenders</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Snapshot of leading real-time video-generation model families and their common dataset directions.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {contenders.map((item) => (
                <Card key={item.name}>
                  <CardHeader>
                    <CardTitle className="text-xl">{item.name}</CardTitle>
                    <CardDescription>{item.focus}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Dataset trend:</span> {item.dataset}
                    </p>
                    <Link
                      href={item.paper}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-400"
                    >
                      View arXiv paper <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
