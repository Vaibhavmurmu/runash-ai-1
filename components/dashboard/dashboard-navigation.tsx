"use client"

import { useState } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export function DashboardNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} navConfig={dashboardNavigationConfig} />
      <div className="md:pl-64">
        <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} navConfig={dashboardNavigationConfig} />
      </div>
    </>
  )
}
