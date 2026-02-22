"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { DashboardModelDialogProvider } from "@/components/dashboard/model-dialog-provider"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

interface DashboardLayoutFrameProps {
  children: ReactNode
  footer?: ReactNode
}

export function DashboardLayoutFrame({ children, footer }: DashboardLayoutFrameProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <DashboardModelDialogProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-100/30 dark:to-orange-950/30">
        <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} navConfig={dashboardNavigationConfig} />

        <div className="flex min-h-screen flex-col md:pl-64">
          <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} navConfig={dashboardNavigationConfig} />
          <main className="mx-auto flex w-full max-w-7xl flex-1 p-4 md:p-6">{children}</main>
          {footer ? <div className="w-full">{footer}</div> : null}
        </div>
      </div>
    </DashboardModelDialogProvider>
  )
}
