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
} from "lucide-react"

type ThemeMode = "light" | "dark"

const sidebarItems = [
  { label: "Live Studio", icon: Video },
  { label: "Shopping Flows", icon: ShoppingBag },
  { label: "Agentic Co-Host", icon: Bot },
  { label: "AI Editor", icon: Sparkles },
]

const inputActions = [
  { label: "Live Studio", icon: Video },
  { label: "Product Pinning", icon: ShoppingBag },
  { label: "Real-time Avatar Talk", icon: Bot },
  { label: "AI Video Generator", icon: Clapperboard },
  { label: "AI Commerce Editor", icon: Sparkles },
  { label: "Upload Assets", icon: Upload },
]

const categories = [
  "RunAsh AI Launch Templates",
  "RunAsh AI Product Stories",
  "RunAsh AI Realtime Hosts",
]

const templates = [
  {
    title: "RunAsh AI Live Studio",
    body: "Scene composer, AI teleprompter, dynamic product overlays, and live control room in one interface.",
  },
  {
    title: "RunAsh AI Avatar Talk",
    body: "Natural voice conversations for product Q&A, objections, and multilingual audience engagement.",
  },
  {
    title: "RunAsh AI Commerce Copilot",
    body: "Automated offer timing, stock nudges, checkout prompts, and shopping intent routing.",
  },
  {
    title: "RunAsh AI Video Generator",
    body: "Generate promotional clips, hooks, and in-stream creative variants while staying on-brand.",
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
              <p className="text-sm font-semibold tracking-wide">RunAsh AI Live Commerce</p>
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
              <Tag isDark={isDark}>Agentic live commerce • AI studio • realtime video</Tag>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">RunAsh AI Live Commerce Command Center</h1>
              <p className={`mx-auto mt-4 max-w-2xl text-sm sm:text-base ${isDark ? "text-white/70" : "text-zinc-600"}`}>
                Plan your next shopping show with RunAsh AI by launching a studio, pinning products in real time, and generating conversion-ready video creative.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/stream" className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
                Launch RunAsh AI Studio
              </Link>
              <Link
                href="/ecommerce/dashboard"
                className={`rounded-full border px-4 py-2 text-sm font-medium ${isDark ? "border-white/15 text-white hover:bg-white/10" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"}`}
              >
                Setup Shopping Session
              </Link>
              <Link
                href="/ai-editor"
                className={`rounded-full border px-4 py-2 text-sm font-medium ${isDark ? "border-white/15 text-white hover:bg-white/10" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"}`}
              >
                Open RunAsh AI Editor
              </Link>
            </div>

            <div className={`mx-auto mt-8 max-w-3xl rounded-3xl border p-3 sm:p-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-white/90 shadow-lg shadow-orange-100/40"}`}>
              <Link
                href="/dashboard/chat"
                className={`flex min-h-14 items-center rounded-2xl px-3 text-left text-sm sm:text-base ${isDark ? "bg-black/30 text-white/65" : "bg-zinc-50 text-zinc-500"}`}
              >
                Prompt RunAsh AI: Build tonight&apos;s live commerce session with product pinning moments, host cues, and checkout-first CTAs.
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

            <p className="mt-8 text-sm font-medium">RunAsh AI categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <Tag key={category} isDark={isDark}>
                  {category}
                </Tag>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {templates.map((item) => (
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
              <p className="text-sm font-medium">RunAsh AI prompt previews</p>
              <div className="mt-3 space-y-2">
                {[
                  "Launch a RunAsh AI studio flow for a flash sale with timed product pinning and avatar-led FAQ responses.",
                  "Generate a 30-second RunAsh AI teaser that transitions from product demo to one-click checkout CTA.",
                  "Create a RunAsh AI shopping session playbook with moderator actions, inventory alerts, and closing scripts.",
                ].map((prompt) => (
                  <p key={prompt} className={`rounded-xl px-3 py-2 text-sm ${isDark ? "bg-black/30 text-white/80" : "bg-white text-zinc-700"}`}>
                    {prompt}
                  </p>
                ))}
              </div>
              <Link href="/dashboard/chat" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                Open RunAshChat Studio <ArrowRight className="h-4 w-4" />
              </Link>
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
