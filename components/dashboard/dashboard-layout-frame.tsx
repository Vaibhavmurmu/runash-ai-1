"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { dashboardNavigationConfig } from "@/components/dashboard/dashboard-nav-config";
import { DashboardSidebarFrame } from "@/components/dashboard/dashboard-sidebar-frame";
import { DashboardModelDialogProvider } from "@/components/dashboard/model-dialog-provider";

const SIDEBAR_STORAGE_KEY = "runash.dashboard.sidebar.v1";

function getInitialSidebarCollapsedState() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const persisted = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (!persisted) {
      return false;
    }

    const parsed = JSON.parse(persisted);
    return typeof parsed?.collapsed === "boolean" ? parsed.collapsed : false;
  } catch {
    return false;
  }
}

interface DashboardLayoutFrameProps {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  contentClassName?: string;
  contentCollapsedClassName?: string;
}

export function DashboardLayoutFrame({
  children,
  footer,
  header,
  contentClassName,
  contentCollapsedClassName,
}: DashboardLayoutFrameProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarCollapsedState,
  );

  return (
    <DashboardModelDialogProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-brand-surface/65 dark:to-brand-surface/45">
        <DashboardSidebarFrame
          mobileOpen={mobileOpen}
          onMobileOpenChange={setMobileOpen}
          navConfig={dashboardNavigationConfig}
          onCollapsedChange={setSidebarCollapsed}
        />

        <div
          className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-out ${sidebarCollapsed ? "md:pl-20" : "md:pl-64"}`}
        >
          {header ?? (
            <DashboardHeader
              onOpenMobileMenu={() => setMobileOpen(true)}
              navConfig={dashboardNavigationConfig}
            />
          )}
          <DashboardContent
            className={
              sidebarCollapsed
                ? (contentCollapsedClassName ?? contentClassName)
                : contentClassName
            }
          >
            {children}
          </DashboardContent>
          {footer ? <div className="w-full">{footer}</div> : null}
        </div>
      </div>
    </DashboardModelDialogProvider>
  );
}
