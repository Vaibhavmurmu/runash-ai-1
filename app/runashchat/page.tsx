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

const quickActions = [
  { label: "Attach", icon: Upload },
  { label: "Search", icon: Sparkles },
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
]

function Tag({ children, isDark }: { children: ReactNode; isDark: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm ${
        isDark
          ? "border-runash-border/80 bg-runash-surface-2 text-runash-text-muted"
          : "border-runash-border bg-runash-surface-2 text-runash-text-muted"
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
        <div className="h-9 w-9 rounded-xl bg-runash-orange-gradient p-2">
          <Image src="/logo.png" alt="RunAsh AI" width={20} height={20} className="h-full w-full object-contain" />
        </div>
        {!collapsed ? <p className={`text-sm font-semibold ${isDark ? "text-runash-text-strong" : "text-runash-text-strong"}`}>RunAshChat</p> : null}
      </div>

      <nav className="space-y-1">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring focus-visible:ring-offset-2 focus-visible:ring-offset-runash-surface-1 ${
              isDark
                ? "text-runash-text-muted hover:bg-runash-surface-2 hover:text-runash-text-strong"
                : "text-runash-text-muted hover:bg-runash-surface-2 hover:text-runash-text-strong"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="ml-3">{label}</span> : null}
          </button>
        ))}
      </nav>

      {!collapsed ? (
        <div className="mt-auto rounded-2xl border border-runash-border bg-runash-surface-2 p-4">
          <p className="text-sm font-medium text-runash-text-strong">Go live faster</p>
          <p className="mt-1 text-xs text-runash-text-muted">Sign in to save studio presets, product bundles, and AI host voices.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/login" className="rounded-md border border-runash-border bg-runash-surface-1 px-2 py-1 text-xs text-runash-text-muted transition hover:text-runash-text-strong">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-runash-orange-gradient px-2 py-1 text-xs font-medium text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring focus-visible:ring-offset-2 focus-visible:ring-offset-runash-surface-2"
            >
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
        ? "bg-runash-surface-1 text-runash-text-strong"
        : "bg-gradient-to-b from-runash-surface-2 via-runash-surface-1 to-runash-surface-3 text-runash-text-strong",
    [isDark],
  )

  return (
    <main className={`min-h-screen transition-colors ${shellClass}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <aside
          className={`hidden border-r border-runash-border p-3 md:block ${desktopCollapsed ? "w-20" : "w-72"} ${
            isDark ? "bg-runash-surface-1" : "bg-runash-surface-1/90"
          }`}
        >
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setDesktopCollapsed((prev) => !prev)}
              className="rounded-lg border border-runash-border p-1.5 text-runash-text-muted transition hover:bg-runash-surface-2 hover:text-runash-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring"
              aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <SidebarContent collapsed={desktopCollapsed} isDark={isDark} />
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-runash-border bg-runash-surface-1/90 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg border border-runash-border p-1.5 text-runash-text-muted transition hover:bg-runash-surface-2 hover:text-runash-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring md:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold tracking-wide">RunAsh AI</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="rounded-lg border border-runash-border p-2 text-runash-text-muted transition hover:bg-runash-surface-2 hover:text-runash-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm text-runash-text-muted transition hover:bg-runash-surface-2 hover:text-runash-text-strong">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-runash-orange-gradient px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-runash-primary/30 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring"
              >
                Sign up for free
              </Link>
            </div>
          </header>

          <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-12 sm:px-6">
            <div className="rounded-3xl border border-runash-border bg-runash-orange-gradient-soft p-6 text-center sm:p-8">
              <Tag isDark={isDark}>Agentic live commerce • AI studio • realtime video</Tag>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Where should we begin?</h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm text-runash-text-muted sm:text-base">
                Build a modern livestream shopping experience with AI hosts, live selling automation, realtime talking agents, and a custom RunAsh editor.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-runash-border bg-runash-surface-1 p-3 sm:p-4">
              <Link
                href="/dashboard/chat"
                className="flex min-h-14 items-center rounded-2xl bg-runash-surface-2 px-3 text-left text-sm text-runash-text-muted transition hover:text-runash-text-strong sm:text-base"
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
                    className="rounded-full border border-runash-border bg-runash-surface-1 p-2 text-runash-text-muted transition hover:text-runash-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring"
                    aria-label="Add attachment"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-runash-orange-gradient p-2 text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring"
                    aria-label="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {productCards.map((item) => (
                <article key={item.title} className="rounded-2xl border border-runash-border bg-runash-surface-1 p-5">
                  <h2 className="text-lg font-semibold text-runash-text-strong">{item.title}</h2>
                  <p className="mt-2 text-sm text-runash-text-muted">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-runash-border bg-runash-orange-gradient p-5 text-white sm:p-6">
              <p className="text-sm font-medium text-white/95">Prompt previews</p>
              <div className="mt-3 space-y-2">
                {previewPrompts.map((prompt) => (
                  <p key={prompt} className="rounded-xl bg-black/15 px-3 py-2 text-sm text-white/90 backdrop-blur-sm">
                    {prompt}
                  </p>
                ))}
              </div>
              <Link
                href="/dashboard/chat"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Open RunAshChat Studio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close sidebar overlay" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative h-full w-72 border-r border-runash-border bg-runash-surface-1 p-3">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-runash-border p-1.5 text-runash-text-muted transition hover:bg-runash-surface-2 hover:text-runash-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-runash-ring"
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
