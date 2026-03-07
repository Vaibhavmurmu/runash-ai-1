"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Heart,
  ImageIcon,
  LayoutGrid,
  Menu,
  MessageSquarePlus,
  Paperclip,
  PlaySquare,
  Plus,
  Search,
  ShoppingBag,
  Volume2,
  X,
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

function SidebarContent({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-800">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-zinc-300 text-xs">◎</span>
          {!collapsed && <span className="font-medium">RunAsh</span>}
        </Link>

        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1 px-2">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-200/90 hover:text-zinc-900"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-auto p-3">
          <div className="rounded-2xl border border-zinc-300 bg-zinc-50 p-3">
            <p className="text-sm font-medium text-zinc-900">Get responses tailored to you</p>
            <p className="mt-2 text-xs text-zinc-500">Log in to save chats and unlock faster RunAshChat workflows.</p>
            <Link href="/login" className="mt-3 block rounded-full bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white">
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
    <main className="flex min-h-screen bg-zinc-100 text-zinc-900">
      {isMobileOpen && (
        <button type="button" aria-label="Close menu overlay" className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[82%] max-w-[280px] border-r border-zinc-300 bg-zinc-200 transition-transform lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-3 py-2">
          <button
            type="button"
            aria-label="Close mobile sidebar"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-md p-1.5 text-zinc-600 transition hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-[calc(100%-44px)] flex-col">
          <SidebarContent collapsed={false} onToggle={() => setIsMobileOpen(false)} />
        </div>
      </aside>

      <aside
        className={`relative hidden border-r border-zinc-300 bg-zinc-200 transition-all duration-300 lg:flex lg:flex-col ${
          isDesktopCollapsed ? "lg:w-[74px]" : "lg:w-[270px]"
        }`}
      >
        <SidebarContent collapsed={isDesktopCollapsed} onToggle={() => setIsDesktopCollapsed((prev) => !prev)} />
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="rounded-md p-1.5 text-zinc-600 transition hover:bg-zinc-200 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-base font-medium text-zinc-900 sm:text-lg">RunAshChat</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white sm:px-4 sm:py-2 sm:text-sm">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-white sm:px-4 sm:py-2 sm:text-sm"
            >
              Sign up for free
            </Link>
            <button type="button" className="rounded-full p-1.5 text-zinc-600 transition hover:bg-zinc-200" aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 sm:px-6">
          <h1 className="mb-8 text-center text-3xl font-medium tracking-tight text-zinc-900 sm:text-5xl">Where should we begin?</h1>

          <div className="w-full max-w-3xl rounded-3xl border border-zinc-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2">
              <button
                type="button"
                aria-label="Add"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900"
              >
                <Plus className="h-4 w-4" />
              </button>
              <Link href="/dashboard/chat" className="flex-1 text-sm text-zinc-500 transition hover:text-zinc-700">
                Ask anything
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-300"
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
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-100"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs text-zinc-500">Preview prompt: “Find trending products and generate a 15-sec promo video script.”</p>
          </div>
        </div>

        <p className="px-4 pb-3 text-center text-xs text-zinc-500">
          By messaging RunAshChat, you agree to our Terms and have read our Privacy Policy.
        </p>
      </section>
    </main>
  )
}
