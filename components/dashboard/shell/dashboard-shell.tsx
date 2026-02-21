"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { DashboardNavbar } from "./navbar"
import { DashboardSidebar } from "./sidebar"

interface DashboardShellProps {
  children: ReactNode
  footer?: ReactNode
}

export function DashboardShell({ children, footer }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-50/20 dark:to-orange-950/20">
      <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      <div className="flex min-h-screen flex-col md:pl-64">
        <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1">{children}</main>
        {footer}
      </div>
    </div>
  )
}
