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
  MessageSquarePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Volume2,
} from "lucide-react"

const sidebarItems = [
  { label: "New chat", icon: MessageSquarePlus },
  { label: "Search chats", icon: Search },
  { label: "Images", icon: ImageIcon },
  { label: "Apps", icon: AppWindow },
  { label: "Deep research", icon: Compass },
  { label: "Health", icon: Heart },
]

export default function RunAshChatLandingPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <main className="flex min-h-screen bg-[#ececec] text-[#1f1f1f]">
      <aside
        className={`relative hidden border-r border-black/10 bg-[#e3e3e3] transition-all duration-300 md:flex md:flex-col ${
          isSidebarCollapsed ? "md:w-[72px]" : "md:w-[270px]"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-black/20 text-xs">◎</span>
            {!isSidebarCollapsed && <span>RunAsh</span>}
          </Link>

          <button
            type="button"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="rounded-md p-1.5 text-black/65 transition hover:bg-black/5 hover:text-black"
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="space-y-1 px-3 pt-2">
          {sidebarItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-black/80 transition hover:bg-black/5"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {!isSidebarCollapsed && (
          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-black/10 bg-white/35 p-3">
              <p className="text-sm font-medium">Get responses tailored to you</p>
              <p className="mt-2 text-xs text-black/55">
                Log in to get answers based on saved chats, plus create images and upload files.
              </p>
              <Link
                href="/login"
                className="mt-3 block rounded-full border border-black/15 bg-white/60 py-2 text-center text-sm font-medium transition hover:bg-white"
              >
                Log in
              </Link>
            </div>
          </div>
        )}
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="rounded-md p-1.5 text-black/70 transition hover:bg-black/5 md:hidden"
              aria-label="Toggle sidebar"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <p className="text-xl font-medium">RunAshChat</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-black/15 bg-white/50 px-4 py-2 text-sm font-medium text-black/85 transition hover:bg-white"
            >
              Sign up for free
            </Link>
            <button type="button" className="ml-1 rounded-full p-2 text-black/70 transition hover:bg-black/5" aria-label="Help">
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          <h1 className="mb-8 text-4xl font-medium tracking-tight">Ask a question</h1>

          <div className="w-full max-w-2xl rounded-full border border-black/15 bg-white/60 p-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Add attachments"
                className="grid h-8 w-8 place-items-center rounded-full text-black/70 transition hover:bg-black/5"
              >
                <Plus className="h-4 w-4" />
              </button>
              <Link href="/dashboard/chat" className="flex-1 px-1 text-sm text-black/45 transition hover:text-black/65">
                Ask anything
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-[#ececec] px-3 py-1.5 text-xs font-medium text-black/85 transition hover:bg-[#dfdfdf]"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Voice
              </button>
            </div>
          </div>
        </div>

        <p className="pb-3 text-center text-xs text-black/45">
          By messaging RunAshChat, you agree to our Terms and have read our Privacy Policy.
        </p>
      </section>
    </main>
  )
}
