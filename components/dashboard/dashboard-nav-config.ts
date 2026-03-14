import type { LucideIcon } from "lucide-react"
import {
  Bot,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
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
    activeMatch: (pathname) => pathname === "/dashboard",
  },
  {
    label: "Workspace",
    href: "/dashboard/library",
    icon: FolderKanban,
    section: "core",
    children: [
      { label: "Create project", href: "/dashboard/create-project" },
      { label: "Library", href: "/dashboard/library" },
      { label: "Templates", href: "/dashboard/templates" },
      { label: "Design system", href: "/dashboard/design-system" },
      { label: "Documentation", href: "/dashboard/documentation" },
      { label: "API management", href: "/dashboard/api" },
    ],
    activeMatch: (pathname) =>
      [
        "/dashboard/create-project",
        "/dashboard/library",
        "/dashboard/templates",
        "/dashboard/design-system",
        "/dashboard/documentation",
      ].some((prefix) => matchesPathPrefix(pathname, prefix)),
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
      { label: "Seller analytics", href: "/seller/analytics", optional: true },
    ],
    activeMatch: (pathname) =>
      matchesPathPrefix(pathname, "/workflows") ||
      matchesPathPrefix(pathname, "/stream") ||
      matchesPathPrefix(pathname, "/ecommerce") ||
      matchesPathPrefix(pathname, "/seller"),
  },
  {
    label: "Team",
    href: "/dashboard/members",
    icon: Users,
    section: "operations",
    children: [
      { label: "Members", href: "/dashboard/members" },
      { label: "API keys", href: "/dashboard/api" },
      { label: "Developer docs", href: "/dashboard/documentation" },
    ],
    activeMatch: (pathname) =>
      matchesPathPrefix(pathname, "/dashboard/members") ||
      matchesPathPrefix(pathname, "/dashboard/api") ||
      matchesPathPrefix(pathname, "/dashboard/documentation"),
  },
  {
    label: "Settings",
    href: "/dashboard/general",
    icon: Settings,
    section: "account",
    children: [
      { label: "General", href: "/dashboard/general" },
      { label: "Profile", href: "/dashboard/profile" },
      { label: "Preferences", href: "/dashboard/preferences" },
      { label: "Connections", href: "/dashboard/connections" },
    ],
    activeMatch: (pathname) =>
      ["/dashboard/general", "/dashboard/profile", "/dashboard/preferences", "/dashboard/connections"].some((prefix) =>
        matchesPathPrefix(pathname, prefix),
      ),
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    section: "account",
    children: [
      { label: "Billing", href: "/dashboard/billing" },
      { label: "Usage", href: "/dashboard/usage" },
      { label: "Refer", href: "/dashboard/refer" },
    ],
    activeMatch: (pathname) =>
      ["/dashboard/billing", "/dashboard/usage", "/dashboard/refer"].some((prefix) =>
        matchesPathPrefix(pathname, prefix),
      ),
  },
]

export const dashboardQuickLinkGroups: DashboardQuickLinkGroup[] = [
  {
    label: "Primary",
    icon: LayoutDashboard,
    items: dashboardNavItems.filter((item) =>
      ["Dashboard", "Workspace", "Agents", "Automation", "Workflows"].includes(item.label),
    ),
  },
  {
    label: "Account",
    icon: CreditCard,
    items: dashboardNavItems.filter((item) => ["Team", "Settings", "Billing"].includes(item.label)),
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Create project", href: "/dashboard/create-project" },
  { label: "Library", href: "/dashboard/library" },
  { label: "Templates", href: "/dashboard/templates" },
  { label: "Members", href: "/dashboard/members" },
  { label: "API", href: "/dashboard/api" },
  { label: "Billing", href: "/dashboard/billing" },
  { label: "Usage", href: "/dashboard/usage" },
  { label: "Documentation", href: "/dashboard/documentation" },
  { label: "Agents", href: "/agents/dashboard" },
  { label: "Automation", href: "/automation" },
  { label: "Workflows", href: "/workflows" },
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
  "create-project": "Create Project",
  library: "Library",
  billing: "Billing",
  usage: "Usage",
  general: "General",
  profile: "Profile",
  refer: "Refer",
  preferences: "Preferences",
  connections: "Connections",
  templates: "Templates",
  "design-system": "Design System",
  members: "Members",
  api: "API",
  documentation: "Documentation",
  stream: "Streaming",
  agents: "Agents",
  automation: "Automation",
  workflows: "Workflows",
  ecommerce: "Store",
  seller: "Seller",
  settings: "Settings",
  payments: "Payments",
  editor: "Editor",
  runashchat: "RunAshChat",
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
  if (matchesPathPrefix(pathname, "/editor")) return "Editor"
  if (matchesPathPrefix(pathname, "/runashchat")) return "RunAshChat"
  if (matchesPathPrefix(pathname, "/agents")) return "Agents"
  if (matchesPathPrefix(pathname, "/automation")) return "Automation"
  if (matchesPathPrefix(pathname, "/workflows")) return "Workflows"
  if (matchesPathPrefix(pathname, "/stream")) return "Streaming"
  if (matchesPathPrefix(pathname, "/ecommerce")) return "Store"
  if (matchesPathPrefix(pathname, "/seller")) return "Seller"
  if (["/dashboard/general", "/dashboard/profile", "/dashboard/preferences", "/dashboard/connections"].some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "Settings"
  }
  if (["/dashboard/billing", "/dashboard/usage", "/dashboard/refer"].some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "Billing"
  }
  if (["/dashboard/members", "/dashboard/api"].some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "Team"
  }
  if (["/dashboard/create-project", "/dashboard/library", "/dashboard/templates", "/dashboard/design-system", "/dashboard/documentation"].some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "Workspace"
  }
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
