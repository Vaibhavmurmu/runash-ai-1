"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BookOpenText, CircleHelp, Gavel, Lock, Server } from "lucide-react"

import { FooterBrand } from "@/components/branding/footer-brand"

const FOOTER_LINKS = [
  { label: "Status", href: "/status", icon: Server },
  { label: "Help", href: "/support", icon: CircleHelp },
  { label: "Version", href: "/releases", icon: BookOpenText },
  { label: "Legal", href: "/legal", icon: Gavel },
  { label: "Privacy", href: "/privacy", icon: Lock },
] as const

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0.0"

function formatLastSync(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function DashboardFooter() {
  const [lastSync, setLastSync] = useState(() => formatLastSync(new Date()))

  useEffect(() => {
    const updateLastSync = () => setLastSync(formatLastSync(new Date()))
    const intervalId = window.setInterval(updateLastSync, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const year = useMemo(() => new Date().getFullYear(), [])

  return (
    <footer className="sticky bottom-0 z-20 border-t border-border/70 bg-card/85 px-4 py-4 text-xs text-muted-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 md:static md:px-6 md:py-5 dark:bg-card/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-[11px] font-medium text-foreground">System healthy</span>
          </div>
          <p className="text-[11px]">Last sync: {lastSync}</p>
        </div>

        <div className="hidden items-center justify-between gap-3 sm:flex">
          <nav aria-label="Dashboard footer links" className="flex items-center gap-5 text-xs font-medium">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-[11px]">Shortcuts: ⌘K Search · G then D Dashboard</p>
        </div>

        <nav aria-label="Dashboard quick actions" className="grid grid-cols-2 gap-2 sm:hidden">
          {FOOTER_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2 py-2 text-[11px] font-medium text-foreground/90 transition-colors hover:bg-card"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-[11px]">
          <div className="flex items-center gap-3">
            <FooterBrand />
            <p>© {year} RunAsh.AI</p>
          </div>
          <p>{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  )
}
