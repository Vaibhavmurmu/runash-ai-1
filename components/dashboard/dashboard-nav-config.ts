import type { LucideIcon } from "lucide-react"
import {
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  ListOrdered,
  MessageSquare,
  Radio,
  Receipt,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react"

export type DashboardNavSection = "primary"

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
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard"),
  },
  {
    label: "RunAsh Chat",
    href: "/runash-chat",
    icon: MessageSquare,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/runash-chat"),
  },
  {
    label: "Editor",
    href: "/editor",
    icon: Clapperboard,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/editor"),
  },
  {
    label: "Model",
    href: "#model-dialog",
    icon: Sparkles,
    section: "primary",
    actionId: "open-model-dialog",
  },
  {
    label: "Streaming Studio",
    href: "/stream",
    icon: Radio,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/stream"),
  },
  {
    label: "Streams",
    href: "/dashboard/streams",
    icon: Radio,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/dashboard/streams"),
  },
  {
    label: "Seller Studio",
    href: "/seller/dashboard",
    icon: ShoppingBag,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/seller"),
  },
  {
    label: "Store",
    href: "/ecommerce/dashboard",
    icon: Store,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/ecommerce"),
  },
  {
    label: "Support",
    href: "/support",
    icon: LifeBuoy,
    section: "primary",
    activeMatch: (pathname) => matchesPathPrefix(pathname, "/support"),
  },
]

export const dashboardQuickLinkGroups: DashboardQuickLinkGroup[] = [
  {
    label: "Editor",
    icon: Clapperboard,
    items: [
      {
        label: "Editor Projects",
        href: "/editor/dashboard",
        icon: FolderKanban,
        section: "primary",
        activeMatch: (pathname) => matchesPathPrefix(pathname, "/editor/dashboard"),
      },
    ],
  },
  {
    label: "Store",
    icon: Store,
    items: [
      {
        label: "Store Orders",
        href: "/ecommerce/history",
        icon: ListOrdered,
        section: "primary",
        activeMatch: (pathname) => matchesPathPrefix(pathname, "/ecommerce/history"),
      },
    ],
  },
  {
    label: "Seller",
    icon: ShoppingBag,
    items: [
      {
        label: "Seller Payouts",
        href: "/seller/dashboard",
        icon: Wallet,
        section: "primary",
        activeMatch: (pathname) => matchesPathPrefix(pathname, "/seller"),
        badge: "Soon",
      },
      {
        label: "Seller Receipts",
        href: "/ecommerce/invoices",
        icon: Receipt,
        section: "primary",
        activeMatch: (pathname) => matchesPathPrefix(pathname, "/ecommerce/invoices"),
      },
    ],
  },
]

export const dashboardQuickActions: DashboardQuickAction[] = [
  { label: "New project", href: "/editor/dashboard" },
  { label: "Go live", href: "/stream" },
  { label: "Open chat session", href: "/runash-chat" },
  { label: "Add product", href: "/ecommerce/dashboard" },
  { label: "Get support", href: "/support" },
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
  seller: "Seller Studio",
  ecommerce: "Store",
  history: "Order History",
  invoices: "Invoices",
  support: "Support",
  streams: "Streams",
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
