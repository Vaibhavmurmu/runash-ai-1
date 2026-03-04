"use client"

import type { ReactNode } from "react"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ThemeToggle from "@/components/theme-toggle"
import {
  ArrowRight,
  Calendar,
  Download,
  ExternalLink,
  FileArchive,
  FileText,
  Globe,
  Mail,
  Megaphone,
} from "lucide-react"

type PressItem = {
  title: string
  date: string
  excerpt: string
  href: string
}

type ArticleItem = PressItem & { publication: string }

const pressReleases: PressItem[] = [
  {
    title: "RunAsh AI Raises $125K Seed Grant to Accelerate AI Live Commerce",
    date: "Jan 20, 2022",
    excerpt:
      "The seed grant supports core R&D in video intelligence, global creator onboarding, and platform reliability.",
    href: "#",
  },
  {
    title: "RunAsh AI Introduces Real-time Video Quality Intelligence",
    date: "Apr 06, 2023",
    excerpt:
      "New models detect low-light, noise, and stream instability to auto-tune output quality while live.",
    href: "#",
  },
  {
    title: "RunAsh AI Launches Public Beta for Sellers and Creators",
    date: "Apr 06, 2024",
    excerpt:
      "The public beta opens the platform to digital storefronts, live sellers, and high-volume creator teams.",
    href: "#",
  },
  {
    title: "RunAsh AI Debuts Multi-Host Live Collaboration Studio",
    date: "Aug 12, 2024",
    excerpt:
      "Teams can now run synchronized multi-host sessions with AI moderation and production support.",
    href: "#",
  },
  {
    title: "RunAsh AI Releases RunAsh Chat for Commerce Workflows",
    date: "Nov 10, 2025",
    excerpt:
      "RunAsh Chat now powers campaign planning, product QA, and seller-assistant automations from one workspace.",
    href: "#",
  },
]

const featuredArticles: ArticleItem[] = [
  {
    publication: "TechSphere",
    title: "How RunAsh AI is rethinking live-selling operations with agentic AI",
    date: "Feb 12, 2026",
    excerpt: "A deep-dive into RunAsh AI's creator stack, commerce workflows, and real-time production tooling.",
    href: "#",
  },
  {
    publication: "The Founder Ledger",
    title: "From creator pain points to a unified AI live platform",
    date: "Jan 27, 2026",
    excerpt: "RunAsh founders discuss product design decisions behind their growth across creator-first markets.",
    href: "#",
  },
  {
    publication: "Build in Public Weekly",
    title: "Scaling support and moderation across thousands of concurrent streams",
    date: "Dec 15, 2025",
    excerpt:
      "How RunAsh AI combines observability, policy tooling, and automation for enterprise-grade livestreaming.",
    href: "#",
  },
]

const mediaKitItems: { title: string; description: string; href: string; icon: ReactNode }[] = [
  {
    title: "Logo Package",
    description: "Official RunAsh logos in PNG and SVG for light and dark backgrounds.",
    href: "/logo.png",
    icon: <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
  },
  {
    title: "Founder Photos",
    description: "Approved founder headshots and profile images for editorial use.",
    href: "/vaibhavmurmu.jpg",
    icon: <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
  },
  {
    title: "Product Screenshots",
    description: "Platform screenshots highlighting live commerce, chat, and dashboard workflows.",
    href: "/runash live shopping.webp",
    icon: <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
  },
  {
    title: "Brand Guidelines",
    description: "Voice, colors, typography, and usage standards for RunAsh visual identity.",
    href: "/about",
    icon: <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
  },
]

const featuredIn = [
  { name: "MIT", src: "/mit logo.png" },
  { name: "RunAsh", src: "/runashlogo.jpg" },
  { name: "RunAsh Alt", src: "/runas-logo .png" },
  { name: "RunAsh Chat", src: "/RunAshChat.png" },
  { name: "RunAsh AI", src: "/runash ai.webp" },
  { name: "RunAsh Studio", src: "/runash studio.webp" },
]

export default function PressPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-950 dark:via-orange-950/30 dark:to-gray-950" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 dark:opacity-10" />

        <div className="container relative z-10 mx-auto px-4">
          <div className="mb-4 flex justify-end">
            <ThemeToggle />
          </div>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 backdrop-blur-sm">
              <Megaphone className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-600 dark:text-orange-400">Press & Media Center</span>
            </div>
            <h1 className="mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-4xl font-bold text-transparent dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 md:text-6xl">
              RunAsh AI in the News
            </h1>
            <p className="mb-8 text-xl text-gray-700 dark:text-gray-300">
              Read announcements, latest coverage, and access approved assets for editorial and partnership use.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white hover:from-orange-700 hover:to-yellow-700">
                <a href="#press-releases">Press Releases <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50">
                <a href="#media-kit">Media Kit <Download className="ml-2 h-4 w-4" /></a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <Tabs defaultValue="press-releases" className="mb-8">
              <TabsList className="w-full flex-wrap justify-start gap-2 bg-orange-100/50 dark:bg-orange-900/20">
                <TabsTrigger value="press-releases">Press Releases</TabsTrigger>
                <TabsTrigger value="news">News Coverage</TabsTrigger>
                <TabsTrigger value="media-kit">Brand Assets</TabsTrigger>
                <TabsTrigger value="contact">Press Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="press-releases" className="mt-6" id="press-releases">
                <div className="space-y-6">
                  {pressReleases.map((item) => (
                    <PressReleaseCard key={item.title} {...item} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="news" className="mt-6">
                <div className="space-y-6">
                  {featuredArticles.map((item) => (
                    <NewsCard key={item.title} {...item} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="media-kit" className="mt-6" id="media-kit">
                <div className="rounded-xl border border-orange-200/50 bg-white p-8 dark:border-orange-900/30 dark:bg-gray-900">
                  <h2 className="mb-4 text-2xl font-bold">Media Kit Resources</h2>
                  <p className="mb-8 text-gray-700 dark:text-gray-300">
                    Download official logos, product visuals, and approved brand material.
                  </p>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {mediaKitItems.map((item) => (
                      <MediaKitCard key={item.title} {...item} />
                    ))}
                  </div>

                  <div className="mt-8 text-center">
                    <Button asChild className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white hover:from-orange-700 hover:to-yellow-700">
                      <Link href="/logo.png">Download Starter Asset <FileArchive className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="mt-6">
                <div className="rounded-xl border border-orange-200/50 bg-white p-8 dark:border-orange-900/30 dark:bg-gray-900">
                  <h2 className="mb-6 text-2xl font-bold">Press Contact</h2>
                  <p className="mb-8 text-gray-700 dark:text-gray-300">
                    For interviews, podcast bookings, contributor quotes, and product briefings, contact our media desk.
                  </p>

                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <a className="text-orange-600 hover:underline dark:text-orange-400" href="mailto:press@runash.in">
                        press@runash.in
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <a href="https://x.com/runash.ai" className="text-orange-600 hover:underline dark:text-orange-400">
                        x.com/runash.ai
                      </a>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <section className="relative bg-gradient-to-b from-white via-orange-50/50 to-white py-20 dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="mb-4 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-3xl font-bold text-transparent dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 md:text-4xl">
              Featured In
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Publications, communities, and ecosystem partners that have highlighted RunAsh AI.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {featuredIn.map((item) => (
              <div
                key={item.name}
                className="flex h-28 items-center justify-center rounded-xl border border-orange-200 bg-white p-4 dark:border-orange-800/30 dark:bg-gray-900"
              >
                <Image src={item.src} alt={`${item.name} featured logo`} width={120} height={44} className="h-auto max-h-12 w-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function PressReleaseCard({ title, date, excerpt, href }: PressItem) {
  return (
    <article className="rounded-lg border border-orange-200/50 bg-white p-6 transition-all duration-300 hover:border-orange-500/50 dark:border-orange-900/30 dark:bg-gray-900 dark:hover:border-orange-500/50">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Calendar className="h-4 w-4" />
        <span>{date}</span>
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-4 text-gray-600 dark:text-gray-400">{excerpt}</p>
      <a href={href} className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
        Read Press Release <ArrowRight className="ml-2 h-4 w-4" />
      </a>
    </article>
  )
}

function NewsCard({ title, publication, date, excerpt, href }: ArticleItem) {
  return (
    <article className="rounded-lg border border-orange-200/50 bg-white p-6 transition-all duration-300 hover:border-orange-500/50 dark:border-orange-900/30 dark:bg-gray-900 dark:hover:border-orange-500/50">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{publication}</span>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-4 text-gray-600 dark:text-gray-400">{excerpt}</p>
      <a href={href} className="inline-flex items-center text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
        Read Article <ExternalLink className="ml-2 h-4 w-4" />
      </a>
    </article>
  )
}

function MediaKitCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-orange-200/50 bg-white p-6 transition-all duration-300 hover:border-orange-500/50 dark:border-orange-900/30 dark:bg-gray-900 dark:hover:border-orange-500/50">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">{icon}</div>
        <div>
          <h3 className="mb-1 text-lg font-semibold">{title}</h3>
          <p className="mb-4 text-gray-600 dark:text-gray-400">{description}</p>
          <Button asChild variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50">
            <a href={href} download>
              Download <Download className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
