"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Menu,
  Paperclip,
  PlaySquare,
  Search,
  ShoppingBag,
  Volume2,
  X,
  Plus,
  MessageSquarePlus,
  ImageIcon,
  LayoutGrid,
  Heart,
} from "lucide-react"

const sidebarItems = [
  { label: "New chat", icon: MessageSquarePlus },
  { label: "Search chats", icon: Search },
  { label: "Images", icon: ImageIcon },
  { label: "Apps", icon: LayoutGrid },
  { label: "Health", icon: Heart },
]

const quickActions = [
  { label: "Attach", icon: Paperclip },
  { label: "Search", icon: Search },
  { label: "Shopping", icon: ShoppingBag },
  { label: "Create Video", icon: PlaySquare },
]

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/90">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/20 text-xs">◎</span>
          {!collapsed && <span className="font-medium">RunAsh</span>}
        </Link>
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className="rounded-md p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1 px-2">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-auto p-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-medium text-white">Get responses tailored to you</p>
            <p className="mt-2 text-xs text-white/55">Log in to save chats and unlock faster RunAshChat workflows.</p>
            <Link href="/login" className="mt-3 block rounded-full bg-white px-3 py-2 text-center text-sm font-medium text-black">
              Log in
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export default function RunAshChatLandingPage() {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <main className="flex min-h-screen bg-[#1d1f23] text-white">
      {isMobileOpen && <button type="button" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setIsMobileOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[82%] max-w-[280px] border-r border-white/10 bg-[#17181c] transition-transform lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-3 py-2">
          <button
            type="button"
            aria-label="Close mobile sidebar"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-[calc(100%-44px)] flex-col">
          <Sidebar collapsed={false} onToggle={() => setIsMobileOpen(false)} />
        </div>
      </aside>

      <aside
        className={`relative hidden border-r border-white/10 bg-[#17181c] transition-all duration-300 lg:flex lg:flex-col ${
          isDesktopCollapsed ? "lg:w-[74px]" : "lg:w-[270px]"
        }`}
      >
        <Sidebar collapsed={isDesktopCollapsed} onToggle={() => setIsDesktopCollapsed((prev) => !prev)} />
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-base font-medium text-white/95 sm:text-lg">RunAshChat</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black sm:px-4 sm:py-2 sm:text-sm">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
            >
              Sign up for free
            </Link>
            <button type="button" className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10" aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 sm:px-6">
          <h1 className="mb-8 text-center text-3xl font-medium tracking-tight text-white/95 sm:text-5xl">Where should we begin?</h1>

          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#2a2c31] p-4 shadow-2xl shadow-black/25">
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#23252a] px-2 py-2">
              <button
                type="button"
                aria-label="Add"
                className="grid h-8 w-8 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
              <Link href="/dashboard/chat" className="flex-1 text-sm text-white/60 transition hover:text-white/90">
                Ask anything
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Voice
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/10"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs text-white/45">Preview prompt: “Find trending products and generate a 15-sec promo video script.”</p>
          </div>
        </div>

        <p className="px-4 pb-3 text-center text-xs text-white/45">
          By messaging RunAshChat, you agree to our Terms and have read our Privacy Policy.
        </p>
      </section>
    </main>
  )
}
