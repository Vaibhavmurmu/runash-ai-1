import type { LucideIcon } from "lucide-react"
import {
  Flame,
  Bell,
  Bot,
  Clapperboard,
  CreditCard,
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Settings,
  SlidersHorizontal,
  ShoppingBag,
  Store,
  Sparkles,
  UploadCloud,
  Upload,
  Video,
  Workflow,
  User,
  FolderPlus,
  History,
  Hand,
  ArrowUpCircle,
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
    label: "Streaming Studio",
    href: "/dashboard/streaming-studio",
    icon: Radio,
    section: "studio",
    metadata: {
      badgeCount: 0,
      statusChip: "live",
      quickActionIcon: Flame,
    },
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/streaming-studio"),
  },
  {
    label: "Welcome onboarding",
    href: "/dashboard/onboarding",
    icon: Hand,
    section: "core",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/onboarding"),
  },
  {
    label: "Create project",
    href: "/dashboard/projects/new",
    icon: FolderPlus,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/projects/new"),
  },
  {
    label: "Live session resume",
    href: "/dashboard/live-session",
    icon: History,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/live-session"),
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    section: "operations",
    children: [
      { label: "Stream analytics", href: "/analytics/streams", optional: true },
      { label: "Seller analytics", href: "/seller/analytics", optional: true },
      { label: "Store analytics", href: "/ecommerce/analytics", optional: true },
    ],
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/analytics"),
  },
  {
    label: "Upload",
    href: "/upload",
    icon: Upload,
    section: "studio",
    metadata: {
      badgeCount: 0,
      statusChip: "pro",
      quickActionIcon: UploadCloud,
    },
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
    href: "/dashboard/alerts",
    icon: Bell,
    section: "operations",
    metadata: {
      badgeCount: 0,
    },
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/alerts"),
  },
  {
    label: "Profile",
    href: "/dashboard/account",
    icon: User,
    section: "account",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/account"),
  },
  {
    label: "Preferences",
    href: "/dashboard/settings",
    icon: SlidersHorizontal,
    section: "account",
    activeMatch: (pathname) => pathname === "/dashboard/settings",
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    section: "account",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/billing"),
  },
  {
    label: "Upgrade",
    href: "/dashboard/upgrade",
    icon: ArrowUpCircle,
    section: "account",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/upgrade"),
  },
  {
    label: "Feedback",
    href: "/dashboard/feedback",
    icon: MessageSquare,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/feedback"),
  },
  {
    label: "AI Agents",
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
    label: "RunAsh Chat",
    href: "/dashboard/runash-chat",
    icon: MessageSquare,
    section: "intelligence",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/runash-chat"),
  },
  {
    label: "Editor",
    href: "/dashboard/editor",
    icon: Clapperboard,
    section: "studio",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/editor"),
  },
  {
    label: "Seller Studio",
    href: "/dashboard/seller-studio",
    icon: ShoppingBag,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/seller-studio"),
  },
  {
    label: "Store",
    href: "/dashboard/store",
    icon: Store,
    section: "operations",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/store"),
  },
]

export const dashboardQuickLinkGroups: DashboardQuickLinkGroup[] = [
  {
    label: "Creator",
    icon: Clapperboard,
    items: dashboardNavItems.filter((item) => ["Streaming Studio", "Upload", "Recordings", "Editor"].includes(item.label)),
  },
  {
    label: "Ops",
    icon: Settings,
    items: dashboardNavItems.filter((item) => ["Analytics", "Alerts", "Feedback", "Preferences", "AI Agents", "Automation"].includes(item.label)),
  },
  {
    label: "Commerce",
    icon: Store,
    items: dashboardNavItems.filter((item) => ["Seller Studio", "Store"].includes(item.label)),
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = [
  { label: "Open onboarding", href: "/dashboard/onboarding" },
  { label: "New project", href: "/dashboard/editor" },
  { label: "Create project wizard", href: "/dashboard/projects/new" },
  { label: "Go live", href: "/dashboard/streaming-studio" },
  { label: "Previous live overview", href: "/dashboard/live-session" },
  { label: "Resume previous live setup", href: "/stream?resume=last-live" },
  { label: "Open recent recording edit", href: "/recordings?view=recent-edit" },
  { label: "Replay analytics for last live", href: "/dashboard/analytics?replay=last-live" },
  { label: "Open chat session", href: "/dashboard/runash-chat" },
  { label: "Add product", href: "/dashboard/store" },
  { label: "Configure automation", href: "/automation" },
  { label: "Manage plans", href: "/dashboard/upgrade" },
  { label: "Account overview", href: "/dashboard/account" },
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
  onboarding: "Onboarding",
  projects: "Projects",
  new: "Create Project",
  live: "Live",
  session: "Session",
  resume: "Resume",
  schedule: "Schedule",
  analytics: "Analytics",
  upload: "Upload",
  recordings: "Recordings",
  alerts: "Alerts",
  settings: "Settings",
  profile: "Profile",
  billing: "Billing",
  feedback: "Feedback",
  upgrade: "Upgrade",
  account: "Account",
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
  const isAccountRoute =
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/dashboard/account") ||
    pathname.startsWith("/dashboard/upgrade") ||
    pathname.startsWith("/dashboard/billing")
  const sectionLabel = isAccountRoute ? "Account" : matchedItem?.label ?? "Workspace"
  const pathSegments = pathname.split("/").filter(Boolean)

  if (isAccountRoute) {
    const accountRouteLabels: Record<string, string> = {
      "/dashboard/settings": "Preferences",
      "/dashboard/account": "Profile",
      "/dashboard/billing": "Billing",
      "/dashboard/upgrade": "Upgrade",
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
