"use client"

import type React from "react"
import { DashboardLayoutFrame } from "@/components/dashboard/dashboard-layout-frame"
import { workspaceNavigationConfig } from "@/components/dashboard/workspace-nav-config"

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayoutFrame
      navConfig={workspaceNavigationConfig}
      contentClassName="mx-auto flex w-full max-w-[1200px] flex-1 justify-center p-4 md:p-6"
    >
      {children}
    </DashboardLayoutFrame>
  )
}
