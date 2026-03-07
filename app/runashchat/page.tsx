"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronDown, Circle, Mail, Mic, Search, Sparkles, Wand2 } from "lucide-react"

const navItems = ["Templates", "Resources", "Enterprise", "Pricing", "iOS", "Students", "FAQ"]

const inputActions = [
  { label: "Contact Form", icon: Mail },
  { label: "Image Editor", icon: Wand2 },
  { label: "Mini Game", icon: Sparkles },
  { label: "Finance Calculator", icon: Circle },
]

const categories = ["Apps and Games", "Landing Pages", "Components", "Dashboards"]

const templates = [
  { title: "Nano Banana Pro Playground", subtitle: "4.9K • 589", image: "/RunAshChat.png" },
  { title: "Brillance SaaS Landing Page", subtitle: "11.3K • 1.7K", image: "/logo.png" },
  { title: "3D Gallery Photography Template", subtitle: "2.9K • 736", image: "/RunAshChat.png" },
  { title: "Opus landing page", subtitle: "888 • 231", image: "/logo.png" },
  { title: "AI Gateway Starter", subtitle: "1.2K • 233", image: "/RunAshChat.png" },
  { title: "Globe To Map Transform", subtitle: "1.6K • 495", image: "/logo.png" },
]

function Pill({ children }: { children: ReactNode }) {
  return <button className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">{children}</button>
}

export default function RunAshChatLandingPage() {
  return (
    <main className="min-h-screen bg-black px-2 pb-8 pt-1 text-white sm:px-4">
      <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-[#08090b]">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              v2
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-white/75 lg:flex">
              {navItems.map((item) => (
                <button key={item} type="button" className="inline-flex items-center gap-1 hover:text-white">
                  {item}
                  {item === "Templates" || item === "Resources" ? <ChevronDown className="h-3 w-3" /> : null}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-sm hover:bg-white/10">
              Sign In
            </Link>
            <Link href="/signup" className="rounded-md border border-white/15 bg-white px-3 py-1 text-sm text-black hover:bg-white/90">
              Sign Up
            </Link>
          </div>
        </header>

        <section className="px-4 py-12 sm:px-8">
          <h1 className="mb-4 text-center text-4xl font-semibold">What do you want to create?</h1>

          <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <Link href="/dashboard/chat" className="block rounded-lg px-2 py-1 text-lg text-white/50 hover:text-white/80">
              Ask V0 to build...
            </Link>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70">
                v0 Mini <ChevronDown className="h-3 w-3" />
              </button>
              <button type="button" className="rounded-lg bg-white px-2 py-1 text-black">
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mx-auto mt-4 flex max-w-4xl flex-wrap gap-2">
            {inputActions.map(({ label, icon: Icon }) => (
              <Pill key={label}>
                <span className="inline-flex items-center gap-1 text-xs sm:text-sm">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </Pill>
            ))}
            <Pill>
              <Search className="h-3.5 w-3.5" />
            </Pill>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-4xl font-semibold leading-tight">Start with a template</h2>
              <button type="button" className="mt-2 text-sm text-white/80 hover:text-white">
                Browse all →
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Pill key={category}>
                  <span className="text-xs sm:text-sm">{category}</span>
                </Pill>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {templates.map((template) => (
              <article key={template.title} className="rounded-xl border border-white/10 bg-black/40 p-2">
                <div className="relative h-44 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                  <Image src={template.image} alt={template.title} fill className="object-cover opacity-90" />
                </div>
                <div className="flex items-end justify-between p-2">
                  <div>
                    <h3 className="text-sm font-medium">{template.title}</h3>
                    <p className="text-xs text-white/60">{template.subtitle}</p>
                  </div>
                  <span className="text-xs text-white/60">Free</span>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-white/10 p-6 text-center">
            <button type="button" className="rounded-md border border-white/20 px-5 py-2 text-sm hover:bg-white/10">
              Browse all
            </button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/50 p-6">
              <p className="text-5xl font-semibold leading-tight">Prompt.<br />Build.Publish.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/50 p-6">
              <h3 className="text-3xl font-semibold">Sync with a repo</h3>
              <p className="mt-3 text-white/70">Connect to GitHub and push code directly to your repository.</p>
              <div className="mt-8 h-10 rounded-full bg-white/10" />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
