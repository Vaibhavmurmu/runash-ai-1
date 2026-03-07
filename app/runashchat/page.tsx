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
  ChevronDown,
  Search,
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
  {
    title: "Agentic Live Commerce",
    description: "Launch AI-powered live selling sessions with auto product highlights and script suggestions.",
  },
  {
    title: "Real-time Stream Generation",
    description: "Generate vertical or landscape live stream scenes in seconds with instant scene transitions.",
  },
  {
    title: "Custom AI Studio",
    description: "Compose cameras, overlays, and talking avatars from a single clean RunAsh control surface.",
  },
  {
    title: "Shopping + Chat Automation",
    description: "Convert comments into cart-ready offers with smart responses, pricing hooks, and follow-up prompts.",
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
              <p className="text-sm font-semibold tracking-wide">RunAsh AI </p>
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
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Where should we begin?</h1>
              <p className={`mx-auto mt-4 max-w-2xl text-sm sm:text-base ${isDark ? "text-white/70" : "text-zinc-600"}`}>
                Build a modern livestream shopping experience with AI hosts, live selling automation, realtime talking agents, and a custom RunAsh editor.
              </p>
            </div>

            <div className={`mx-auto mt-8 max-w-3xl rounded-3xl border p-3 sm:p-4 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-white/90 shadow-lg shadow-orange-100/40"}`}>
              <Link
                href="/dashboard/chat"
                className={`flex min-h-14 items-center rounded-2xl px-3 text-left text-sm sm:text-base ${isDark ? "bg-black/30 text-white/65" : "bg-zinc-50 text-zinc-500"}`}
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
              {productCards.map((item) => (
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
              <p className="text-sm font-medium">Prompt previews</p>
              <div className="mt-3 space-y-2">
                {previewPrompts.map((prompt) => (
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
