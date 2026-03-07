"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Menu,
  Mic,
  Moon,
  Plus,
  ShoppingBag,
  Sparkles,
  Sun,
  Upload,
  Video,
  X,
  Waves,
} from "lucide-react"

type ThemeMode = "light" | "dark"

const sidebarItems = [
  { label: "Live Talk", icon: Waves },
  { label: "AI Editor", icon: Sparkles },
  { label: "Live Studio", icon: Video },
  { label: "Live Selling", icon: ShoppingBag },
  { label: "Shopping Flows", icon: ShoppingBag },
  { label: "Agentic Co-Host", icon: Bot },
  { label: "Video Generator", icon: Video },
]

const inputActions = [
  { label: "Upload Product Feed", icon: Upload },
  { label: "Draft Live Script", icon: Sparkles },
  { label: "Pin Commerce Offers", icon: ShoppingBag },
  { label: "Generate Scene Clips", icon: Clapperboard },
]

const templates = [
  "Launch a live talk agent for tonight's drop with objections handling, multilingual responses, and auto CTA timing.",
  "Build a shopping stream storyboard with studio scenes, product pinning moments, and limited-time bundle triggers.",
  "Create real-time video generation prompts for teaser loops, countdown overlays, and conversion-first callouts.",
]

const categories = [
  {
    title: "Live Talk Agent",
    body: "Deploy an always-on AI co-host that answers product questions, handles objections, and keeps the stream conversion-focused.",
  },
  {
    title: "Studio Scene Builder",
    body: "Compose branded live layouts with teleprompter cues, presenter guides, and dynamic commerce overlays in seconds.",
  },
  {
    title: "Product Pinning",
    body: "Pin products, bundles, and flash offers at the right timestamp to turn audience intent into immediate checkout actions.",
  },
  {
    title: "Real-time Video Generation",
    body: "Create hooks, demo shots, and background loops while live so your content adapts to audience behavior instantly.",
  },
  {
    title: "Live Selling Automation",
    body: "Automate offer sequencing, urgency messaging, and follow-up prompts to keep every session high intent and measurable.",
  },
  {
    title: "Shopping Stream Orchestration",
    body: "Coordinate host actions, audience prompts, and cart nudges from one RunAsh flow built for agentic commerce.",
  },
  {
    title: "Live Commerce Analytics",
    body: "Track engagement spikes, pin performance, and conversion moments in-stream to optimize your next show.",
  },
  {
    title: "Agentic Commerce Workflows",
    body: "Turn chat signals into automated actions for product recommendations, restock alerts, and post-live recovery campaigns.",
  },
]

function Tag({ children, isDark }: { children: ReactNode; isDark: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm ${
        isDark
          ? "border-white/15 bg-white/5 text-white/85"
          : "border-zinc-200 bg-white text-zinc-700 shadow-sm"
      }`}
    >
      {children}
    </span>
  )
}

function SidebarContent({ collapsed, isDark }: { collapsed: boolean; isDark: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 p-2">
          <Image src="/logo.png" alt="RunAsh AI" width={20} height={20} className="h-full w-full object-contain" />
        </div>
        {!collapsed ? <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-zinc-900"}`}>RunAshChat</p> : null}
      </div>

      <nav className="space-y-1">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
              isDark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="ml-3">{label}</span> : null}
          </button>
        ))}
      </nav>

      {!collapsed ? (
        <div className={`mt-auto rounded-2xl border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white"}`}>
          <p className={`text-sm font-medium ${isDark ? "text-white" : "text-zinc-900"}`}>Go live faster</p>
          <p className={`mt-1 text-xs ${isDark ? "text-white/70" : "text-zinc-600"}`}>
            Sign in to save studio presets, product bundles, and AI host voices.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/login" className={`rounded-md px-2 py-1 text-xs ${isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-700"}`}>
              Log in
            </Link>
            <Link href="/signup" className="rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-1 text-xs text-white">
              Start free
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function RunAshChatLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>("light")

  const isDark = theme === "dark"
  const shellClass = useMemo(
    () =>
      isDark
        ? "bg-[#09090b] text-white"
        : "bg-gradient-to-b from-orange-50 via-white to-zinc-100 text-zinc-900",
    [isDark],
  )

  return (
    <main className={`min-h-screen transition-colors ${shellClass}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <aside
          className={`hidden border-r p-3 md:block ${desktopCollapsed ? "w-20" : "w-72"} ${
            isDark ? "border-white/10 bg-black/40" : "border-zinc-200/80 bg-white/70"
          }`}
        >
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setDesktopCollapsed((prev) => !prev)}
              className={`rounded-lg border p-1.5 ${isDark ? "border-white/15 hover:bg-white/10" : "border-zinc-200 hover:bg-zinc-100"}`}
              aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <SidebarContent collapsed={desktopCollapsed} isDark={isDark} />
        </aside>

        <div className="flex flex-1 flex-col">
          <header className={`sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur sm:px-6 ${isDark ? "border-white/10 bg-black/40" : "border-zinc-200/80 bg-white/80"}`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={`rounded-lg border p-1.5 md:hidden ${isDark ? "border-white/15" : "border-zinc-200"}`}
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold tracking-wide">RunAshChat</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className={`rounded-lg border p-2 ${isDark ? "border-white/15 hover:bg-white/10" : "border-zinc-200 hover:bg-zinc-100"}`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link href="/login" className={`rounded-full px-3 py-1.5 text-sm ${isDark ? "text-white/80 hover:bg-white/10" : "text-zinc-700 hover:bg-zinc-100"}`}>
                Log in
              </Link>
              <Link href="/signup" className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm">
                Sign up for free
              </Link>
            </div>
          </header>

          <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-12 sm:px-6">
            <div className="text-center">
              <Tag isDark={isDark}>Live streaming automation • Live selling • Agentic commerce</Tag>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Run your next shopping stream with AI operators.</h1>
              <p className={`mx-auto mt-4 max-w-2xl text-sm sm:text-base ${isDark ? "text-white/70" : "text-zinc-600"}`}>
                RunAshChat helps teams design live studio scenes, automate live selling moves, and scale agentic commerce without losing brand control.
              </p>
            </div>

            <div className={`mx-auto mt-8 max-w-3xl rounded-3xl border p-3 sm:p-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-white/90 shadow-lg shadow-orange-100/40"}`}>
              <Link
                href="/dashboard/streaming-studio"
                className={`flex min-h-14 items-center rounded-2xl px-3 text-left text-sm sm:text-base ${isDark ? "bg-black/30 text-white/65" : "bg-zinc-50 text-zinc-500"}`}
              >
                Prompt your RunAsh operator: Build a live selling script with product pinning, scene transitions, and checkout CTAs.
              </Link>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {inputActions.map(({ label, icon: Icon }) => (
                    <Tag key={label} isDark={isDark}>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                    </Tag>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-full border p-2 ${isDark ? "border-white/15 bg-white/5" : "border-zinc-200 bg-white"}`}
                    aria-label="Add attachment"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 p-2 text-white"
                    aria-label="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {categories.map((item) => (
                <article
                  key={item.title}
                  className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-white/90"}`}
                >
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className={`mt-2 text-sm ${isDark ? "text-white/70" : "text-zinc-600"}`}>{item.body}</p>
                </article>
              ))}
            </div>

            <div className={`mt-8 rounded-2xl border p-5 sm:p-6 ${isDark ? "border-white/10 bg-gradient-to-r from-orange-500/15 to-amber-400/10" : "border-orange-100 bg-gradient-to-r from-orange-100 to-amber-50"}`}>
              <p className="text-sm font-medium">RunAsh templates</p>
              <div className="mt-3 space-y-2">
                {templates.map((prompt) => (
                  <p key={prompt} className={`rounded-xl px-3 py-2 text-sm ${isDark ? "bg-black/30 text-white/80" : "bg-white text-zinc-700"}`}>
                    {prompt}
                  </p>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/dashboard/streaming-studio" className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                  Start Live Studio <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/dashboard/live-session" className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                  Create Shopping Stream <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close sidebar overlay" onClick={() => setMobileMenuOpen(false)} />
          <aside className={`relative h-full w-72 border-r p-3 ${isDark ? "border-white/10 bg-black" : "border-zinc-200 bg-white"}`}>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-lg border p-1.5 ${isDark ? "border-white/15" : "border-zinc-200"}`}
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent collapsed={false} isDark={isDark} />
          </aside>
        </div>
      ) : null}
    </main>
  )
}
