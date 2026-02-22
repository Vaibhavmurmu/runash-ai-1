"use client"

import { useState } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

export function DashboardNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <div className="md:pl-64">
        <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} />
      </div>
    </>
  )
}
