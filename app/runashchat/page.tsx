"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import {
  Bot,
  ChevronDown,
  Clapperboard,
  Menu,
  Mic,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Video,
  Waves,
  X,
} from "lucide-react"

const sidebarItems = [
  { label: "Live Studio", icon: Clapperboard },
  { label: "Live Selling", icon: ShoppingBag },
  { label: "Video Generator", icon: Video },
  { label: "Live Talk", icon: Waves },
  { label: "AI Editor", icon: Sparkles },
]

const quickActions = ["Attach", "Search", "Shopping", "Create Video"]

const cards = [
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

function ShellPill({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-orange-400/40 dark:hover:text-orange-300"
    >
      {children}
    </button>
  )
}

function SidebarContent({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
        {!collapsed ? <p className="text-sm font-semibold tracking-tight">RunAshChat</p> : null}
      </div>

      <div className="px-2 py-2">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-orange-50 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-white/10"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed ? <span>{label}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-auto p-3">
        {!collapsed ? (
          <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-orange-50 p-3 dark:border-white/10 dark:from-white/5 dark:to-orange-500/10">
            <p className="text-xs font-medium text-zinc-900 dark:text-white">Upgrade Studio</p>
            <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
              Unlock multi-stream control, AI hosts, and premium commerce automations.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function RunAshChatLandingPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-[#06070a] dark:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside
          className={`hidden border-r border-zinc-200 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-[#0b0d12] lg:block ${
            desktopSidebarCollapsed ? "w-[84px]" : "w-72"
          } transition-all duration-200`}
        >
          <div className="flex h-12 items-center justify-end px-3">
            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((prev) => !prev)}
              className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-700 hover:text-orange-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
              aria-label={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
          <SidebarContent collapsed={desktopSidebarCollapsed} />
        </aside>

        <div className="relative flex-1">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-3 backdrop-blur dark:border-white/10 dark:bg-[#090b10]/90 sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 lg:hidden dark:border-white/15 dark:bg-white/5 dark:text-zinc-200"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold tracking-tight">RunAsh AI</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-white/10">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:opacity-90"
              >
                Sign up for free
              </Link>
            </div>
          </header>

          {mobileSidebarOpen ? (
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
          ) : null}
          <aside
            className={`fixed left-0 top-0 z-50 h-full w-[290px] border-r border-zinc-200 bg-white transition-transform duration-200 dark:border-white/10 dark:bg-[#0b0d12] lg:hidden ${
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-12 items-center justify-end px-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md border border-zinc-200 text-zinc-700 dark:border-white/15 dark:text-zinc-200"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent />
          </aside>

          <section className="px-4 pb-8 pt-10 sm:px-6 lg:px-10 lg:pt-14">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">Where should we begin?</h1>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-600 dark:text-zinc-300">
                Professional live-streaming automation for studio production, live commerce, and real-time video intelligence.
              </p>

              <div className="mx-auto mt-7 max-w-4xl rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <Link
                  href="/dashboard/chat"
                  className="flex min-h-14 items-center rounded-2xl px-4 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-300 dark:hover:bg-white/5"
                >
                  Describe your live automation flow, shopping goals, and stream style...
                </Link>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-black/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:text-orange-600 dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
                      aria-label="Add input"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    {quickActions.map((action) => (
                      <ShellPill key={action}>{action}</ShellPill>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100"
                    >
                      RunAsh Pro <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 text-white"
                      aria-label="Use voice"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 px-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Preview prompt: “Create a live shopping session with AI host intro, product cards, and real-time comment replies.”
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {cards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
                      <Search className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-semibold">{card.title}</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{card.description}</p>
                  </article>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-zinc-200 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 p-1 shadow-md dark:border-orange-400/20">
                <div className="rounded-xl bg-white/95 p-4 dark:bg-[#0a0c11]/85 sm:p-5">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-lg font-semibold">RunAsh AI Live Studio</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        One place for live video generation, studio automation, agentic selling, and custom editor workflows.
                      </p>
                    </div>
                    <Image src="/RunAshChat.png" alt="RunAsh AI preview" width={120} height={40} className="h-10 w-auto rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
