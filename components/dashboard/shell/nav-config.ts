import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  Calendar,
  Clapperboard,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShoppingBag,
  Store,
  Upload,
  Users,
  Video,
} from "lucide-react"

export type DashboardNavSection = "primary" | "secondary"

export interface DashboardNavItem {
  label: string
  href: string
  icon: LucideIcon
  section: DashboardNavSection
  badge?: string
  activeMatch?: (pathname: string) => boolean
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "primary",
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
    label: "Store",
    href: "/ecommerce/dashboard",
    icon: Store,
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/ecommerce"),
  },
  {
    label: "Seller Dashboard",
    href: "/seller/dashboard",
    icon: ShoppingBag,
    section: "primary",
    activeMatch: (pathname) => pathname.startsWith("/seller"),
  },
  {
    label: "Go Live",
    href: "/stream",
    icon: Video,
    section: "secondary",
    badge: "New",
    activeMatch: (pathname) => pathname.startsWith("/stream"),
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: Calendar,
    section: "secondary",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    section: "secondary",
    activeMatch: (pathname) => pathname.startsWith("/analytics"),
  },
  {
    label: "Upload",
    href: "/upload",
    icon: Upload,
    section: "secondary",
  },
  {
    label: "Recordings",
    href: "/recordings",
    icon: Video,
    section: "secondary",
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
    section: "secondary",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "secondary",
  },
  {
    label: "Community",
    href: "/community",
    icon: Users,
    section: "secondary",
  },
  {
    label: "Help & Support",
    href: "/support",
    icon: HelpCircle,
    section: "secondary",
  },
]

export function getNavItemsBySection(section: DashboardNavSection) {
  return dashboardNavItems.filter((item) => item.section === section)
}

export function isNavItemActive(pathname: string, item: DashboardNavItem) {
  return item.activeMatch ? item.activeMatch(pathname) : pathname === item.href
}
