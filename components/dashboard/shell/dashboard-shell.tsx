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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-100/30 dark:to-orange-950/30">
      <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />

      <div className="flex min-h-screen flex-col md:pl-64">
        <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="mx-auto flex w-full max-w-7xl flex-1 p-4 md:p-6">{children}</main>
        {footer ? <div className="w-full">{footer}</div> : null}
      </div>
    </div>
  )
}
