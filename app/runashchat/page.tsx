"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Menu,
  Mic,
  Moon,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  Upload,
  Video,
  Waves,
  X,
} from "lucide-react"

const sidebarItems = [
  { label: "Live Talk", icon: Waves },
  { label: "AI Editor", icon: Sparkles },
  { label: "Live Studio", icon: Video },
  { label: "Live Selling", icon: ShoppingBag },
  { label: "Shopping Flows", icon: ShoppingBag },
  { label: "Agentic Co-Host", icon: Bot },
  { label: "Video Generator", icon: Video },
]

const quickActions = [
  { label: "Attach", icon: Upload },
  { label: "Search", icon: Search },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Create Video", icon: Clapperboard },
]

const previewPrompts = [
  "Build a live-selling flow for skincare bundle launch with host script + CTA overlays.",
  "Generate a 45-second product teaser video with orange gradient brand transitions.",
  "Create a studio checklist for agentic live commerce with inventory sync and moderation.",
]

const productCards = [
  {
    title: "RunAsh AI Studio",
    body: "Scene composer, AI teleprompter, dynamic product overlays, and live control room in one interface.",
  },
  {
    title: "Realtime Talk Engine",
    body: "Natural voice conversations for product Q&A, objections, and multilingual audience engagement.",
  },
  {
    title: "Commerce Copilot",
    body: "Automated offer timing, stock nudges, checkout prompts, and shopping intent routing.",
  },
  {
    title: "Live Video Generation",
    body: "Generate promotional clips, hooks, and in-stream creative variants while staying on-brand.",
  },
  {
    title: "Agentic Live Commerce",
    body: "Launch AI-powered live selling sessions with auto product highlights and script suggestions.",
  },
  {
    title: "Real-time Stream Generation",
    body: "Generate vertical or landscape live stream scenes in seconds with instant scene transitions.",
  },
  {
    title: "Custom AI Studio",
    body: "Compose cameras, overlays, and talking avatars from a single clean RunAsh control surface.",
  },
  {
    title: "Shopping + Chat Automation",
    body: "Convert comments into cart-ready offers with smart responses, pricing hooks, and follow-up prompts.",
  },
]

const categories = [
  "RunAsh AI Launch Templates",
  "RunAsh AI Product Stories",
  "RunAsh AI Realtime Hosts",
]

function Tag({ children, isDark }: { children: ReactNode; isDark: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm ${
        isDark
          ? "border-border bg-card/70 text-foreground"
          : "border-border bg-card text-foreground shadow-sm"
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
        {!collapsed ? <p className="text-sm font-semibold text-foreground">RunAshChat</p> : null}
      </div>

      <nav className="space-y-1">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="ml-3">{label}</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-3">
        {!collapsed ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">Upgrade Studio</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unlock multi-stream control, AI hosts, and premium commerce automations.
            </p>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Go live faster</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to save studio presets, product bundles, and AI host voices.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/login" className="rounded-md bg-muted px-2 py-1 text-xs text-foreground hover:bg-accent">
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
  const { resolvedTheme, setTheme } = useTheme()

  const isDark = resolvedTheme === "dark"
  const shellClass = useMemo(
    () =>
      isDark
        ? "bg-background text-foreground"
        : "bg-gradient-to-b from-orange-50 via-background to-muted text-foreground",
    [isDark],
  )

  return (
    <main className={`min-h-screen transition-colors ${shellClass}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <aside
          className={`hidden border-r border-border bg-card/80 p-3 md:block ${desktopCollapsed ? "w-20" : "w-72"}`}
        >
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setDesktopCollapsed((prev) => !prev)}
              className="rounded-lg border border-border p-1.5 hover:bg-accent"
              aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <SidebarContent collapsed={desktopCollapsed} isDark={isDark} />
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg border border-border p-1.5 md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold tracking-wide">RunAsh AI</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="rounded-lg border border-border p-2 hover:bg-accent"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                RunAsh Pro <ChevronDown className="h-3 w-3" />
              </button>
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
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
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Where should we begin?</h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Build a modern livestream shopping experience with AI hosts, live selling automation, realtime talking agents, and a custom RunAsh editor.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-border bg-card p-3 shadow-lg shadow-orange-100/40 dark:shadow-none sm:p-4">
              <Link
                href="/dashboard/chat"
                className="flex min-h-14 items-center rounded-2xl bg-muted px-3 text-left text-sm text-muted-foreground sm:text-base"
              >
                Preview prompt: Create a high-converting live-selling stream for tomorrow&apos;s launch.
              </Link>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {quickActions.map(({ label, icon: Icon }) => (
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
                    className="rounded-full border border-border bg-card p-2"
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
              {productCards.map((item) => (
                <article key={item.title} className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-100 to-amber-50 p-5 dark:border-orange-900/50 dark:from-orange-500/15 dark:to-amber-400/10 sm:p-6">
              <p className="text-sm font-medium">Prompt previews</p>
              <div className="mt-3 space-y-2">
                {previewPrompts.map((prompt) => (
                  <p key={prompt} className="rounded-xl bg-background px-3 py-2 text-sm text-muted-foreground">
                    {prompt}
                  </p>
                ))}
              </div>
              <Link href="/dashboard/chat" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                Open RunAshChat Studio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/stream" className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
                Launch RunAsh AI Studio
              </Link>
              <Link
                href="/ecommerce/dashboard"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Setup Shopping Session
              </Link>
              <Link
                href="/ai-editor"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Open RunAsh AI Editor
              </Link>
            </div>

            <p className="mt-8 text-sm font-medium">RunAsh AI categories</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <Tag key={category} isDark={isDark}>
                  {category}
                </Tag>
              ))}
            </div>
          </section>

          <div className="mt-8 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-100 to-amber-50 p-5 dark:border-orange-900/50 dark:from-orange-500/15 dark:to-amber-400/10 sm:p-6">
            <div className="rounded-xl bg-white/70 p-4 dark:bg-white/10 sm:p-5">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-lg font-semibold">RunAsh AI Live Studio</p>
                  <p className="text-sm text-muted-foreground">
                    One place for live video generation, studio automation, agentic selling, and custom editor workflows.
                  </p>
                </div>
                <Image src="/RunAshChat.png" alt="RunAsh AI preview" width={120} height={40} className="h-10 w-auto rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close sidebar overlay" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative h-full w-72 border-r border-border bg-card p-3">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-border p-1.5"
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
