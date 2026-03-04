"use client"

import type { DashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"

interface DashboardHeaderProps {
  onOpenMobileMenu: () => void
  navConfig: DashboardNavigationConfig
}

export function DashboardHeader({ onOpenMobileMenu, navConfig }: DashboardHeaderProps) {
  return <DashboardNavbar onOpenMobileMenu={onOpenMobileMenu} navConfig={navConfig} />
}
