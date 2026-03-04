import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, BrainCircuit, Cpu, Download, Gauge, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "RunAsh LLM | RunAsh",
  description:
    "Introducing RunAsh LLM, optimized for efficient fine-tuning on Mistral 7B and Mistral Small 3 for real-world production workflows.",
}

const modelTracks = [
  {
    name: "Mistral 7B Track",
    summary: "Balanced quality and performance for assistant, support, and automation workloads.",
    approach: "QLoRA/LoRA adapters with domain instruction tuning and evaluation loops.",
  },
  {
    name: "Mistral Small 3 Track",
    summary: "Lower-latency, cost-aware deployment profile for high-throughput use cases.",
    approach: "Parameter-efficient fine-tuning with quantized serving and routing-aware prompting.",
  },
]

const stackLinks = [
  { name: "RunAsh", href: "https://runash.in" },
  { name: "RunAsh AI Research Lab", href: "https://runash.in/research-paper" },
  { name: "Hugging Face", href: "https://huggingface.co" },
  { name: "Kaggle", href: "https://www.kaggle.com" },
  { name: "Google Colab", href: "https://colab.research.google.com" },
]

export default function RunAshLlmPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl space-y-8">
          <Badge className="bg-orange-500 text-white hover:bg-orange-600">Introducing RunAsh LLM</Badge>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Efficient Fine-tuning for Mistral 7B & Mistral Small 3
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-4xl">
              RunAsh LLM is a custom model program focused on efficient adaptation, lower serving latency, and
              production-ready quality for enterprise copilots, live operations, and workflow automation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-orange-500" />
                  Efficient Training
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300">
                Parameter-efficient fine-tuning pipelines reduce adaptation time while preserving model quality.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-orange-500" />
                  Deployment Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300">
                Inference profiles target practical throughput, observability, and safe rollout in production systems.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-orange-500" />
                  Domain Adaptation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 dark:text-gray-300">
                Instruction tuning + evaluation harnesses for support, analytics, content, and operations use cases.
              </CardContent>
            </Card>
          </div>

          <Card className="border-orange-200 dark:border-orange-900/40">
            <CardHeader>
              <CardTitle>RunAsh LLM Resources</CardTitle>
              <CardDescription>Open the technical write-up or download the model package.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white hover:from-orange-700 hover:to-yellow-600">
                <Link href="https://arxiv.org/abs/2310.06825" target="_blank" rel="noreferrer">
                  Read Mistral Paper <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100/70 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30">
                <Link href="/downloads/runash-llm-mistral-finetune-pack.zip">
                  Download RunAsh LLM Package <Download className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-semibold">Fine-tuning Tracks</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {modelTracks.map((track) => (
                <Card key={track.name}>
                  <CardHeader>
                    <CardTitle className="text-xl">{track.name}</CardTitle>
                    <CardDescription>{track.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Method:</span> {track.approach}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Ecosystem Links
              </CardTitle>
              <CardDescription>Research, training, and deployment ecosystem for RunAsh LLM.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {stackLinks.map((item) => (
                <Button
                  key={item.name}
                  asChild
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100/70 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
                >
                  <Link href={item.href} target="_blank" rel="noreferrer">
                    {item.name} <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
