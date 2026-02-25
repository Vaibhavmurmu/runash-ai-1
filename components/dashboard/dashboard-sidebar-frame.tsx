"use client";

import type { DashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

interface DashboardSidebarFrameProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  navConfig: DashboardNavigationConfig;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function DashboardSidebarFrame({
  mobileOpen,
  onMobileOpenChange,
  navConfig,
  onCollapsedChange,
}: DashboardSidebarFrameProps) {
  return (
    <DashboardSidebar
      mobileOpen={mobileOpen}
      onMobileOpenChange={onMobileOpenChange}
      navConfig={navConfig}
      onCollapsedChange={onCollapsedChange}
    />
  );
}
