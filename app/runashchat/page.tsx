"use client"

import Link from "next/link"
import { useState } from "react"
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  ImageIcon,
  Menu,
  MessageSquarePlus,
  Plus,
  Search,
  Volume2,
  X,
} from "lucide-react"

const sidebarItems = [
  { label: "New chat", icon: MessageSquarePlus },
  { label: "Search chats", icon: Search },
  { label: "Images", icon: ImageIcon },
  { label: "Apps", icon: AppWindow },
  { label: "Deep research", icon: Compass },
  { label: "Health", icon: Heart },
]

function SidebarContent({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-3 sm:px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-zinc-300 text-xs">◎</span>
          {!collapsed && <span>RunAsh</span>}
        </Link>

        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onCollapse}
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1 px-2 pt-2 sm:px-3">
        {sidebarItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-200/80 hover:text-zinc-900"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-auto p-3 sm:p-4">
          <div className="rounded-2xl border border-zinc-300 bg-white/80 p-3">
            <p className="text-sm font-medium text-zinc-900">Get responses tailored to you</p>
            <p className="mt-2 text-xs text-zinc-500">Log in to get answers based on saved chats, create images, and upload files.</p>
            <Link
              href="/login"
              className="mt-3 block rounded-full border border-zinc-300 bg-zinc-50 py-2 text-center text-sm font-medium text-zinc-800 transition hover:bg-white"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export default function RunAshChatLandingPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <main className="flex min-h-screen bg-zinc-100 text-zinc-900">
      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-black/25 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[84%] max-w-[280px] border-r border-zinc-300 bg-zinc-200 transition-transform duration-300 lg:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end px-3 py-2">
          <button
            type="button"
            aria-label="Close mobile sidebar"
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-[calc(100%-44px)] flex-col">
          <SidebarContent collapsed={false} onCollapse={() => setIsMobileSidebarOpen(false)} />
        </div>
      </aside>

      <aside
        className={`relative hidden border-r border-zinc-300 bg-zinc-200 transition-all duration-300 lg:flex lg:flex-col ${
          isSidebarCollapsed ? "lg:w-[74px]" : "lg:w-[272px]"
        }`}
      >
        <SidebarContent collapsed={isSidebarCollapsed} onCollapse={() => setIsSidebarCollapsed((prev) => !prev)} />
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-3 py-3 sm:px-5 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="rounded-md p-1.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-base font-medium sm:text-lg">RunAshChat</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white sm:px-4 sm:py-2 sm:text-sm">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-white sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="hidden sm:inline">Sign up for free</span>
              <span className="sm:hidden">Sign up</span>
            </Link>
            <button type="button" className="ml-0.5 rounded-full p-1.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 sm:p-2" aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10 sm:px-6 sm:pb-12">
          <h1 className="mb-6 text-3xl font-medium tracking-tight sm:mb-8 sm:text-4xl">Ask a question</h1>

          <div className="w-full max-w-2xl rounded-full border border-zinc-300 bg-white/85 p-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                aria-label="Add attachments"
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Plus className="h-4 w-4" />
              </button>
              <Link href="/dashboard/chat" className="flex-1 px-1 text-sm text-zinc-500 transition hover:text-zinc-700">
                Ask anything
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-200 sm:px-3"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Voice
              </button>
            </div>
          </div>
        </div>

        <p className="px-4 pb-3 text-center text-xs text-zinc-500">
          By messaging RunAshChat, you agree to our Terms and have read our Privacy Policy.
        </p>
      </section>
    </main>
  )
}
