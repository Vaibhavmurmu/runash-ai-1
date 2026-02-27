"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import {
  dashboardNavigationConfig,
  type DashboardNavItem,
  type DashboardNavigationConfig,
} from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { fetchApiData } from "@/lib/api/client"

type RouteMatcher = (pathname: string) => boolean

type DashboardActivity = { id: string }
type DashboardRecentStreamsResponse = { streams: Array<{ status?: string }> }
type DashboardMonitoringResponse = { metrics?: { alerts?: Array<{ triggered?: boolean }> } }

interface DashboardNavCounts {
  alerts: number
  liveStreams: number
  pendingAutomation: number
}

const DEFAULT_NAV_COUNTS: DashboardNavCounts = {
  alerts: 0,
  liveStreams: 0,
  pendingAutomation: 0,
}

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

function parseActivityCount(payload: DashboardActivity[]): number {
  if (!Array.isArray(payload)) {
    return 0
  }

  return payload.length
}

function parseLiveStreamCount(payload: DashboardRecentStreamsResponse): number {
  if (!payload || !Array.isArray(payload.streams)) {
    return 0
  }

  return payload.streams.filter((stream) => stream.status === "live").length
}

function parsePendingAutomationCount(payload: DashboardRecentStreamsResponse): number {
  if (!payload || !Array.isArray(payload.streams)) {
    return 0
  }

  return payload.streams.length
}

function parseAlertCount(payload: DashboardMonitoringResponse): number {
  if (!payload || !Array.isArray(payload.metrics?.alerts)) {
    return 0
  }

  return payload.metrics.alerts.filter((alert) => alert.triggered).length
}

function buildNavigationConfig(baseConfig: DashboardNavigationConfig, counts: DashboardNavCounts): DashboardNavigationConfig {
  const items = baseConfig.items.map((item) => {
    const updatedMetadata = { ...item.metadata }

    if (item.href === "/automation") {
      updatedMetadata.badgeCount = counts.pendingAutomation
    }

    if (item.href === "/payments") {
      updatedMetadata.badgeCount = counts.alerts
    }

    const metadata = Object.keys(updatedMetadata).length > 0 ? updatedMetadata : undefined

    switch (item.href) {
      case "/dashboard":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/dashboard"))
      case "/agents/dashboard":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/agents", ["/ai-agents"]))
      case "/automation":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/automation", ["/workflows"]))
      case "/workflows":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/workflows", ["/dashboard/streaming-studio", "/dashboard/editor", "/dashboard/seller-studio"]))
      case "/payments":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/payments", ["/dashboard/billing", "/payment/dashboard"]))
      default:
        return { ...item, metadata }
    }
  })

  return {
    ...baseConfig,
    items,
  }
}

export function DashboardNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [counts, setCounts] = useState<DashboardNavCounts>(DEFAULT_NAV_COUNTS)

  useEffect(() => {
    const controller = new AbortController()

    async function loadNavCounts() {
      try {
        const [activityPayload, recentStreamsPayload, scheduledStreamsPayload, monitoringPayload] = await Promise.all([
        fetchApiData<DashboardActivity[]>("/api/dashboard/activity?limit=25", { init: { signal: controller.signal }, fallbackMessage: "Failed to load dashboard activity" }),
        fetchApiData<DashboardRecentStreamsResponse>("/api/dashboard/streams/recent?limit=25", { init: { signal: controller.signal }, fallbackMessage: "Failed to load recent streams" }),
        fetchApiData<DashboardRecentStreamsResponse>("/api/dashboard/streams/scheduled", { init: { signal: controller.signal }, fallbackMessage: "Failed to load scheduled streams" }),
        fetchApiData<DashboardMonitoringResponse>("/api/dashboard/operations/monitoring", { init: { signal: controller.signal }, fallbackMessage: "Failed to load monitoring data" }),
      ])

      if (controller.signal.aborted) {
        return
      }

      const liveStreams = recentStreamsPayload ? parseLiveStreamCount(recentStreamsPayload) : 0
      const pendingAutomation = scheduledStreamsPayload ? parsePendingAutomationCount(scheduledStreamsPayload) : 0
      const alertCount = monitoringPayload ? parseAlertCount(monitoringPayload) : activityPayload ? parseActivityCount(activityPayload) : 0

        setCounts({
          alerts: alertCount,
          liveStreams,
          pendingAutomation,
        })
      } catch {
        setCounts(DEFAULT_NAV_COUNTS)
      }
    }

    loadNavCounts()

    return () => {
      controller.abort()
    }
  }, [])

  const navConfig = useMemo(() => buildNavigationConfig(dashboardNavigationConfig, counts), [counts])

  return (
    <>
      <DashboardSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} navConfig={navConfig} />
      <div className="md:pl-64">
        <DashboardNavbar onOpenMobileMenu={() => setMobileOpen(true)} navConfig={navConfig} />
      </div>
    </>
  )
}
