import type { LucideIcon } from "lucide-react"
import {
  Bell,
  Bot,
  CalendarDays,
  Clapperboard,
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Settings,
  ShoppingBag,
  Store,
  Upload,
  Video,
  Workflow,
} from "lucide-react"

export type DashboardNavSection = "core" | "studio" | "intelligence" | "operations" | "account"

export interface DashboardNavItem {
  label: string
  href: string
  icon: LucideIcon
  section: DashboardNavSection
  badge?: string
  actionId?: "open-model-dialog"
  activeMatch?: (pathname: string) => boolean
}

export interface DashboardQuickLinkGroup {
  label: string
  icon: LucideIcon
  items: DashboardNavItem[]
}

export interface DashboardQuickAction {
  label: string
  href: string
}

export interface DashboardNavigationConfig {
  items: DashboardNavItem[]
  quickLinkGroups: DashboardQuickLinkGroup[]
  quickActions: DashboardQuickAction[]
}

export interface DashboardNavContext {
  currentSection: string
  breadcrumbs: { label: string; href?: string }[]
}

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "core",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard"),
  },
  {
    label: "Go Live",
    href: "/stream",
    icon: Radio,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/stream"),
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: CalendarDays,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/schedule"),
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/analytics"),
  },
  {
    label: "Upload",
    href: "/upload",
    icon: Upload,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/upload"),
  },
  {
    label: "Recordings",
    href: "/recordings",
    icon: Video,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/recordings"),
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/alerts"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "account",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/settings"),
  },
  {
    label: "AI Agents",
    href: "/agents/dashboard",
    icon: Bot,
    section: "intelligence",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/agents"),
  },
  {
    label: "Automation",
    href: "/automation",
    icon: Workflow,
    section: "intelligence",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/automation"),
  },
  {
    label: "RunAsh Chat",
    href: "/runash-chat",
    icon: MessageSquare,
    section: "intelligence",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/runash-chat"),
  },
  {
    label: "Editor",
    href: "/editor",
    icon: Clapperboard,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/editor"),
  },
  {
    label: "Seller Studio",
    href: "/seller/dashboard",
    icon: ShoppingBag,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/seller"),
  },
  {
    label: "Store",
    href: "/ecommerce/dashboard",
    icon: Store,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/ecommerce"),
  },
]

export const dashboardQuickLinkGroups: DashboardQuickLinkGroup[] = [
  {
    label: "Creator",
    icon: Clapperboard,
    items: dashboardNavItems.filter((item) => ["Go Live", "Schedule", "Upload", "Recordings", "Editor"].includes(item.label)),
  },
  {
    label: "Ops",
    icon: Settings,
    items: dashboardNavItems.filter((item) => ["Analytics", "Alerts", "Settings", "AI Agents", "Automation"].includes(item.label)),
  },
  {
    label: "Commerce",
    icon: Store,
    items: dashboardNavItems.filter((item) => ["Seller Studio", "Store"].includes(item.label)),
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = [
  { label: "New project", href: "/editor" },
  { label: "Go live", href: "/stream" },
  { label: "Open chat session", href: "/runash-chat" },
  { label: "Add product", href: "/ecommerce/dashboard" },
  { label: "Configure automation", href: "/automation" },
]

export const dashboardNavigationConfig: DashboardNavigationConfig = {
  items: dashboardNavItems,
  quickLinkGroups: dashboardQuickLinkGroups,
  quickActions: dashboardQuickActions,
}

export function getNavItemsBySection(section: DashboardNavSection) {
  return dashboardNavigationConfig.items.filter((item) => item.section === section)
}

export function isNavItemActive(pathname: string, item: DashboardNavItem) {
  return item.activeMatch ? item.activeMatch(pathname) : pathname === item.href
}

const dashboardPathLabels: Record<string, string> = {
  dashboard: "Dashboard",
  runash: "RunAsh",
  chat: "Chat",
  editor: "Editor",
  stream: "Streaming Studio",
  schedule: "Schedule",
  analytics: "Analytics",
  upload: "Upload",
  recordings: "Recordings",
  alerts: "Alerts",
  settings: "Settings",
  agents: "AI Agents",
  automation: "Automation",
  seller: "Seller Studio",
  ecommerce: "Store",
}

function formatSegmentLabel(segment: string) {
  const knownLabel = dashboardPathLabels[segment]

  if (knownLabel) {
    return knownLabel
  }

  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function resolveDashboardNavContext(pathname: string): DashboardNavContext {
  const matchedItem = dashboardNavigationConfig.items.find((item) => isNavItemActive(pathname, item))
  const sectionLabel = matchedItem?.label ?? "Workspace"
  const pathSegments = pathname.split("/").filter(Boolean)

  const breadcrumbs = pathSegments.length
    ? pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join("/")}`
        const isLastSegment = index === pathSegments.length - 1

        return {
          label: formatSegmentLabel(segment),
          href: isLastSegment ? undefined : href,
        }
      })
    : [{ label: "Dashboard" }]

  return {
    currentSection: sectionLabel,
    breadcrumbs,
  }
}
