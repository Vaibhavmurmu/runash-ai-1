import type { LucideIcon } from "lucide-react"
import {
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  ListOrdered,
  MessageSquare,
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
  activeMatch?: (pathname: string) => boolean
}

export interface DashboardQuickLinkGroup {
  label: string
  icon: LucideIcon
  items: DashboardNavItem[]
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
