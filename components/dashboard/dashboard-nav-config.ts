import type { LucideIcon } from "lucide-react"
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  Settings,
  Sparkles,
  Workflow,
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
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/automation"),
  },
  {
    label: "Workflows",
    href: "/workflows",
    icon: Workflow,
    section: "operations",
    children: [
      { label: "Streaming", href: "/stream", optional: true },
      { label: "Store", href: "/ecommerce/dashboard", optional: true },
      { label: "Seller", href: "/seller/dashboard", optional: true },
    ],
    activeMatch: (pathname) =>
      matchesPathPrefix(pathname, "/workflows") ||
      matchesPathPrefix(pathname, "/stream") ||
      matchesPathPrefix(pathname, "/ecommerce") ||
      matchesPathPrefix(pathname, "/seller"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "account",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/settings"),
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
    label: "Primary",
    icon: LayoutDashboard,
    items: dashboardNavItems.filter((item) =>
      ["Dashboard", "Agents", "Automation", "Workflows"].includes(item.label),
    ),
  },
  {
    label: "Account",
    icon: CreditCard,
    items: dashboardNavItems.filter((item) =>
      ["Settings", "Payments"].includes(item.label),
    ),
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Agents", href: "/agents/dashboard" },
  { label: "Automation", href: "/automation" },
  { label: "Workflows", href: "/workflows" },
  { label: "Streaming", href: "/stream" },
  { label: "Store", href: "/ecommerce/dashboard" },
  { label: "Seller", href: "/seller/dashboard" },
  { label: "Settings", href: "/settings" },
  { label: "Payments", href: "/payments" },
]

export const dashboardNavigationConfig: DashboardNavigationConfig = {
  items: dashboardNavItems,
  quickLinkGroups: dashboardQuickLinkGroups,
  quickActions: dashboardQuickActions,
  streamingStudioEntry: {
    label: "Streaming",
    href: "/stream",
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
  stream: "Streaming",
  agents: "Agents",
  automation: "Automation",
  workflows: "Workflows",
  ecommerce: "Store",
  seller: "Seller",
  settings: "Settings",
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

function resolveCurrentSection(pathname: string, fallback: string | undefined) {
  if (matchesPathPrefix(pathname, "/agents")) return "Agents"
  if (matchesPathPrefix(pathname, "/automation")) return "Automation"
  if (matchesPathPrefix(pathname, "/workflows")) return "Workflows"
  if (matchesPathPrefix(pathname, "/stream")) return "Streaming"
  if (matchesPathPrefix(pathname, "/ecommerce")) return "Store"
  if (matchesPathPrefix(pathname, "/seller")) return "Seller"
  if (matchesPathPrefix(pathname, "/settings")) return "Settings"
  if (matchesPathPrefix(pathname, "/payments")) return "Payments"
  if (matchesPathPrefix(pathname, "/dashboard")) return "Dashboard"

  return fallback ?? "Dashboard"
}

export function resolveDashboardNavContext(pathname: string): DashboardNavContext {
  const matchedItem = dashboardNavigationConfig.items.find((item) =>
    isNavItemActive(pathname, item),
  )
  const currentSection = resolveCurrentSection(pathname, matchedItem?.label)
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
    currentSection,
    breadcrumbs,
  }
}
