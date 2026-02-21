"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BookOpenText, LifeBuoy, Lock, ShieldCheck } from "lucide-react"

const FOOTER_LINKS = [
  { label: "Support", href: "/support", icon: LifeBuoy },
  { label: "Docs", href: "/docs", icon: BookOpenText },
  { label: "Security", href: "/security", icon: ShieldCheck },
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
    <footer className="sticky bottom-0 z-20 border-t bg-card/95 px-4 py-3 text-xs text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-card/80 md:static md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-medium text-foreground">System healthy</span>
          </div>
          <p className="text-[11px]">Last sync: {lastSync}</p>
        </div>

        <div className="hidden items-center justify-between gap-3 sm:flex">
          <nav aria-label="Dashboard footer links" className="flex items-center gap-4">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>

          <p>Shortcuts: ⌘K Search · G then D Dashboard</p>
        </div>

        <nav aria-label="Dashboard quick actions" className="grid grid-cols-4 gap-2 sm:hidden">
          {FOOTER_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border/80 px-2 py-1.5 text-[11px] text-foreground/90"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2 text-[11px]">
          <p>© {year} RunAsh.AI</p>
          <p>{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  )
}
