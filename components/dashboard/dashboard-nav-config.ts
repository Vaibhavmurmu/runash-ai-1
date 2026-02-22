import type { LucideIcon } from "lucide-react"
import {
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  ListOrdered,
  MessageSquare,
  Sparkles,
  Radio,
  Receipt,
  ShoppingBag,
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

export interface DashboardNavContext {
  currentSection: string
  breadcrumbs: { label: string; href?: string }[]
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "primary",
    activeMatch: (pathname) => pathname === "/dashboard",
  },
  {
    label: "RunAsh Chat",
    href: "/runash-chat",
    icon: MessageSquare,
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/runash-chat"),
  },
  {
    label: "Editor",
    href: "/editor",
    icon: Clapperboard,
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/editor"),
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
    activeMatch: (pathname) => pathname.startsWith("/stream"),
  },
  {
    label: "Seller Studio",
    href: "/seller/dashboard",
    icon: ShoppingBag,
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/seller"),
  },
  {
    label: "Store",
    href: "/ecommerce/dashboard",
    icon: Store,
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/ecommerce"),
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
        activeMatch: (pathname) => pathname.startsWith("/editor/dashboard"),
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
        activeMatch: (pathname) => pathname.startsWith("/ecommerce/history"),
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
        activeMatch: (pathname) => pathname.startsWith("/seller"),
        badge: "Soon",
      },
      {
        label: "Seller Receipts",
        href: "/ecommerce/invoices",
        icon: Receipt,
        section: "primary",
        activeMatch: (pathname) => pathname.startsWith("/ecommerce/invoices"),
      },
    ],
  },
]

export function getNavItemsBySection(section: DashboardNavSection) {
  return dashboardNavItems.filter((item) => item.section === section)
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
  const matchedItem = dashboardNavItems.find((item) => isNavItemActive(pathname, item))
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
