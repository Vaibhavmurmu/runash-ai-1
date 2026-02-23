"use client"

import { useMemo, useState } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import {
  dashboardNavigationConfig,
  type DashboardNavItem,
  type DashboardNavigationConfig,
} from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

type RouteMatcher = (pathname: string) => boolean

function exactPath(path: string, aliases: string[] = []): RouteMatcher {
  return (pathname) => pathname === path || aliases.includes(pathname)
}

function pathPrefix(path: string, aliases: string[] = []): RouteMatcher {
  return (pathname) => {
    const prefixedPaths = [path, ...aliases]
    return prefixedPaths.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`))
  }
}

function withRouteMatcher(item: DashboardNavItem, activeMatch: RouteMatcher): DashboardNavItem {
  return {
    ...item,
    activeMatch,
  }
}

function buildNavigationConfig(baseConfig: DashboardNavigationConfig): DashboardNavigationConfig {
  const items = baseConfig.items.map((item) => {
    switch (item.href) {
      case "/dashboard":
        return withRouteMatcher(item, exactPath("/dashboard"))
      case "/stream":
        return withRouteMatcher(item, pathPrefix("/stream", ["/dashboard/streams", "/live"]))
      case "/schedule":
        return withRouteMatcher(item, pathPrefix("/schedule", ["/calendar"]))
      case "/analytics":
        return withRouteMatcher(item, pathPrefix("/analytics"))
      case "/upload":
        return withRouteMatcher(item, pathPrefix("/upload"))
      case "/recordings":
        return withRouteMatcher(item, pathPrefix("/recordings"))
      case "/alerts":
        return withRouteMatcher(item, pathPrefix("/alerts", ["/notifications"]))
      case "/settings":
        return withRouteMatcher(item, pathPrefix("/settings", ["/account/settings"]))
      case "/agents/dashboard":
        return withRouteMatcher(item, pathPrefix("/agents", ["/ai-agents"]))
      case "/automation":
        return withRouteMatcher(item, pathPrefix("/automation", ["/workflows"]))
      case "/runash-chat":
        return withRouteMatcher(item, pathPrefix("/runash-chat", ["/chat"]))
      case "/editor":
        return withRouteMatcher(item, pathPrefix("/editor"))
      case "/seller/dashboard":
        return withRouteMatcher(item, pathPrefix("/seller", ["/seller-studio"]))
      case "/ecommerce/dashboard":
        return withRouteMatcher(item, pathPrefix("/ecommerce", ["/store"]))
      default:
        return item
    }
  })

  return {
    ...baseConfig,
    items,
  }
}

export function DashboardNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navConfig = useMemo(() => buildNavigationConfig(dashboardNavigationConfig), [])

  return (
    <>
      <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} navConfig={navConfig} />
      <div className="md:pl-64">
        <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} navConfig={navConfig} />
      </div>
    </>
  )
}
