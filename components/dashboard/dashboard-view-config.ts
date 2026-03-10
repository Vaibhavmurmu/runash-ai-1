import type { LucideIcon } from "lucide-react"
import { Activity, BarChart3, ShieldCheck, ShoppingBag, Video } from "lucide-react"

export type DashboardRolePreset = "creator" | "seller" | "operator"

export type DashboardModuleId =
  | "creator-workflow"
  | "seller-workflow"
  | "operator-workflow"
  | "activity"
  | "expanded-links"

export interface DashboardRoleViewConfig {
  role: DashboardRolePreset
  title: string
  subtitle: string
  primaryModule: DashboardModuleId
  secondaryModule: DashboardModuleId
  summaryMetrics: Array<{
    id: string
    label: string
    statKey: string
    icon: LucideIcon
  }>
  expandedRouteLinks: Array<{ label: string; href: string }>
}

export const dashboardRoleViewConfig: Record<DashboardRolePreset, DashboardRoleViewConfig> = {
  creator: {
    role: "creator",
    title: "Creator workspace",
    subtitle: "Ship content quickly and keep broadcasts healthy.",
    primaryModule: "creator-workflow",
    secondaryModule: "activity",
    summaryMetrics: [
      { id: "live", label: "Live now", statKey: "activeStreams", icon: Video },
      { id: "views", label: "Today views", statKey: "todayViews", icon: BarChart3 },
      { id: "watch", label: "Avg watch time", statKey: "avgWatchTime", icon: Activity },
      { id: "subs", label: "New followers", statKey: "newFollowers", icon: ShieldCheck },
    ],
    expandedRouteLinks: [
      { label: "Streaming studio", href: "/dashboard/streaming-studio" },
      { label: "Recordings", href: "/recordings" },
      { label: "Editor", href: "/editor" },
      { label: "Analytics", href: "/dashboard/analytics" },
    ],
  },
  seller: {
    role: "seller",
    title: "Seller workspace",
    subtitle: "Track revenue and keep your storefront conversion moving.",
    primaryModule: "seller-workflow",
    secondaryModule: "activity",
    summaryMetrics: [
      { id: "orders", label: "Orders", statKey: "ordersToday", icon: ShoppingBag },
      { id: "gmv", label: "GMV", statKey: "grossRevenue", icon: BarChart3 },
      { id: "conv", label: "Conversion", statKey: "conversionRate", icon: Activity },
      { id: "returns", label: "Returns", statKey: "returns", icon: ShieldCheck },
    ],
    expandedRouteLinks: [
      { label: "Seller studio", href: "/dashboard/seller-studio" },
      { label: "Store", href: "/dashboard/store" },
      { label: "Billing", href: "/dashboard/billing" },
      { label: "Analytics", href: "/dashboard/analytics" },
    ],
  },
  operator: {
    role: "operator",
    title: "Operator workspace",
    subtitle: "Resolve incidents and protect service reliability.",
    primaryModule: "operator-workflow",
    secondaryModule: "activity",
    summaryMetrics: [
      { id: "alerts", label: "Open alerts", statKey: "openAlerts", icon: ShieldCheck },
      { id: "sla", label: "SLA", statKey: "sla", icon: BarChart3 },
      { id: "tickets", label: "Tickets", statKey: "tickets", icon: Activity },
      { id: "uptime", label: "Uptime", statKey: "uptime", icon: Video },
    ],
    expandedRouteLinks: [
      { label: "Alerts", href: "/dashboard/alerts" },
      { label: "Automation", href: "/automation" },
      { label: "Feedback", href: "/dashboard/feedback" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
}

export function resolveDashboardRole(input: unknown): DashboardRolePreset {
  const normalized = String(input ?? "").toLowerCase()

  if (["creator", "streamer", "content_creator"].includes(normalized)) {
    return "creator"
  }

  if (["seller", "merchant", "commerce"].includes(normalized)) {
    return "seller"
  }

  if (["operator", "admin", "ops", "support"].includes(normalized)) {
    return "operator"
  }

  return "creator"
}
