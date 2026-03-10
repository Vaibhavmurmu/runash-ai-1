import Link from "next/link"
import { ArrowLeft, ArrowRight, PlayCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

const previewHighlights = [
  "See live AI scene detection and instant title suggestions.",
  "Preview real-time engagement prompts for audience growth.",
  "Explore a complete creator flow from setup to analytics.",
]

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white text-gray-900 dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950 dark:text-gray-100">
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl rounded-3xl border border-orange-200/70 bg-white/90 p-8 shadow-xl backdrop-blur-sm dark:border-orange-900/40 dark:bg-gray-900/80 md:p-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-300/60 bg-orange-100/80 px-4 py-2 text-sm font-medium text-orange-700 dark:border-orange-800/70 dark:bg-orange-950/40 dark:text-orange-300">
            <PlayCircle className="h-4 w-4" />
            Interactive Product Demo
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Preview RunAsh in action</h1>
          <p className="mb-8 text-lg text-gray-700 dark:text-gray-300">
            Get a guided look at how RunAsh helps creators plan, stream, and optimize sessions with AI-first tools.
          </p>

          <ul className="mb-10 space-y-3">
            {previewHighlights.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-gray-700 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200"
              >
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600"
            >
              <Link href="/get-started">
                Start free trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/30"
            >
              <Link href="/features">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to features
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
