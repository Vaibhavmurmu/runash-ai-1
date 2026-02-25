import type { LucideIcon } from "lucide-react"
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  Workflow,
  Sparkles,
} from "lucide-react"

export type DashboardNavSection = "core" | "studio" | "intelligence" | "operations" | "account"

export interface DashboardNavItem {
  label: string
  href: string
  icon: LucideIcon
  section: DashboardNavSection
  badge?: string
  metadata?: DashboardNavItemMetadata
  children?: DashboardNavChildItem[]
  actionId?: "open-model-dialog"
  activeMatch?: (pathname: string) => boolean
}

export interface DashboardNavChildItem {
  label: string
  href: string
  optional?: boolean
}

export interface DashboardNavItemMetadata {
  badgeCount?: number
  statusChip?: "live" | "beta" | "pro"
  quickActionIcon?: LucideIcon
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

export type StreamingStudioActionId =
  | "start-stream"
  | "schedule-stream"
  | "invite-collaborator"
  | "fetch-integration-key"
  | "open-previous-live-session-context"

export interface StreamingStudioEntry {
  label: string
  href: string
  actionIds: StreamingStudioActionId[]
}

export interface DashboardNavigationConfig {
  items: DashboardNavItem[]
  quickLinkGroups: DashboardQuickLinkGroup[]
  quickActions: DashboardQuickAction[]
  streamingStudioEntry: StreamingStudioEntry
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
    label: "Agents",
    href: "/agents/dashboard",
    icon: Bot,
    section: "intelligence",
    metadata: {
      statusChip: "beta",
      quickActionIcon: Sparkles,
    },
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/agents"),
  },
  {
    label: "Automation",
    href: "/automation",
    icon: Workflow,
    section: "intelligence",
    metadata: {
      badgeCount: 0,
    },
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/automation"),
  },
  {
    label: "Workflows",
    href: "/workflows",
    icon: Workflow,
    section: "operations",
    children: [
      { label: "Streaming studio", href: "/dashboard/streaming-studio", optional: true },
      { label: "Editor", href: "/dashboard/editor", optional: true },
      { label: "Seller studio", href: "/dashboard/seller-studio", optional: true },
    ],
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/workflows"),
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    section: "account",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/payments"),
  },
]

export const dashboardQuickLinkGroups: DashboardQuickLinkGroup[] = [
  {
    label: "Core modules",
    icon: LayoutDashboard,
    items: dashboardNavItems.filter((item) => ["Dashboard", "Agents", "Automation"].includes(item.label)),
  },
  {
    label: "Operations",
    icon: Workflow,
    items: dashboardNavItems.filter((item) => ["Workflows", "Payments"].includes(item.label)),
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = [
  { label: "Open dashboard module", href: "/dashboard" },
  { label: "Open agents module", href: "/agents/dashboard" },
  { label: "Open automation module", href: "/automation" },
  { label: "Open workflows module", href: "/workflows" },
  { label: "Open payments module", href: "/payments" },
]

export const dashboardNavigationConfig: DashboardNavigationConfig = {
  items: dashboardNavItems,
  quickLinkGroups: dashboardQuickLinkGroups,
  quickActions: dashboardQuickActions,
  streamingStudioEntry: {
    label: "Streaming Studio",
    href: "/dashboard/streaming-studio",
    actionIds: [
      "start-stream",
      "schedule-stream",
      "invite-collaborator",
      "fetch-integration-key",
      "open-previous-live-session-context",
    ],
  },
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
  agents: "Agents",
  automation: "Automation",
  workflows: "Workflows",
  payments: "Payments",
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
  const isAccountRoute =
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/dashboard/upgrade") ||
    pathname.startsWith("/dashboard/billing") ||
    pathname.startsWith("/payments")
  const sectionLabel = isAccountRoute ? "Account" : matchedItem?.label ?? "Workspace"
  const pathSegments = pathname.split("/").filter(Boolean)

  if (isAccountRoute) {
    const accountRouteLabels: Record<string, string> = {
      "/dashboard/settings": "Preferences",
      "/dashboard/account": "Profile",
      "/dashboard/billing": "Billing",
      "/dashboard/upgrade": "Upgrade",
      "/payments": "Payments",
    }

    const accountBreadcrumbLabel = accountRouteLabels[pathname] ?? formatSegmentLabel(pathSegments[pathSegments.length - 1] ?? "settings")

    return {
      currentSection: sectionLabel,
      breadcrumbs: [{ label: "Account", href: "/dashboard/settings" }, { label: accountBreadcrumbLabel }],
    }
  }

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
