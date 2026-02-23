"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import {
  dashboardNavigationConfig,
  type DashboardNavItem,
  type DashboardNavigationConfig,
} from "@/components/dashboard/dashboard-nav-config"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"

type RouteMatcher = (pathname: string) => boolean

type DashboardActivityResponse = {
  success?: boolean
  data?: unknown
}

type DashboardRecentStreamsResponse = {
  streams?: Array<{ status?: string }>
}

type DashboardMonitoringResponse = {
  metrics?: {
    alerts?: Array<{ triggered?: boolean }>
  }
}

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

function parseActivityCount(payload: DashboardActivityResponse): number {
  if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
    return 0
  }

  return payload.data.length
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

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(url, { signal })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

function buildNavigationConfig(baseConfig: DashboardNavigationConfig, counts: DashboardNavCounts): DashboardNavigationConfig {
  const items = baseConfig.items.map((item) => {
    const updatedMetadata = { ...item.metadata }

    if (item.href === "/alerts") {
      updatedMetadata.badgeCount = counts.alerts
    }

    if (item.href === "/stream") {
      updatedMetadata.badgeCount = counts.liveStreams
    }

    if (item.href === "/automation") {
      updatedMetadata.badgeCount = counts.pendingAutomation
    }

    const metadata = Object.keys(updatedMetadata).length > 0 ? updatedMetadata : undefined

    switch (item.href) {
      case "/dashboard":
        return withRouteMatcher({ ...item, metadata }, exactPath("/dashboard"))
      case "/stream":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/stream", ["/dashboard/streams", "/live"]))
      case "/schedule":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/schedule", ["/calendar"]))
      case "/analytics":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/analytics"))
      case "/upload":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/upload"))
      case "/recordings":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/recordings"))
      case "/alerts":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/alerts", ["/notifications"]))
      case "/settings":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/settings", ["/account/settings"]))
      case "/agents/dashboard":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/agents", ["/ai-agents"]))
      case "/automation":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/automation", ["/workflows"]))
      case "/runash-chat":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/runash-chat", ["/chat"]))
      case "/editor":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/editor"))
      case "/seller/dashboard":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/seller", ["/seller-studio"]))
      case "/ecommerce/dashboard":
        return withRouteMatcher({ ...item, metadata }, pathPrefix("/ecommerce", ["/store"]))
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
      const [activityPayload, recentStreamsPayload, scheduledStreamsPayload, monitoringPayload] = await Promise.all([
        fetchJson<DashboardActivityResponse>("/api/dashboard/activity?limit=25", controller.signal),
        fetchJson<DashboardRecentStreamsResponse>("/api/dashboard/streams/recent?limit=25", controller.signal),
        fetchJson<DashboardRecentStreamsResponse>("/api/dashboard/streams/scheduled", controller.signal),
        fetchJson<DashboardMonitoringResponse>("/api/dashboard/operations/monitoring", controller.signal),
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
