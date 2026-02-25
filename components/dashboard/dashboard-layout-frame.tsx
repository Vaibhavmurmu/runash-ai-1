"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { DashboardModelDialogProvider } from "@/components/dashboard/model-dialog-provider"
import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebarFrame } from "@/components/dashboard/dashboard-sidebar-frame"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

interface DashboardLayoutFrameProps {
  children: ReactNode
  footer?: ReactNode
  header?: ReactNode
  contentClassName?: string
}

export function DashboardLayoutFrame({ children, footer, header, contentClassName }: DashboardLayoutFrameProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <DashboardModelDialogProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-100/30 dark:to-orange-950/30">
        <DashboardSidebarFrame mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} navConfig={dashboardNavigationConfig} />

        <div className="flex min-h-screen flex-col md:pl-64">
          {header ?? <DashboardHeader onOpenMobileMenu={() => setMobileOpen(true)} navConfig={dashboardNavigationConfig} />}
          <DashboardContent className={contentClassName}>{children}</DashboardContent>
          {footer ? <div className="w-full">{footer}</div> : null}
        </div>
      </div>
    </DashboardModelDialogProvider>
  )
}
