"use client"

import type { DashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

interface DashboardSidebarFrameProps {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  navConfig: DashboardNavigationConfig
}

export function DashboardSidebarFrame({ mobileOpen, onMobileOpenChange, navConfig }: DashboardSidebarFrameProps) {
  return <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={onMobileOpenChange} navConfig={navConfig} />
}
