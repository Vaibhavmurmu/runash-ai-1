export type DashboardRouteReadiness = "ready" | "coming-soon"

export interface DashboardRouteAuditEntry {
  href: string
  readiness: DashboardRouteReadiness
  required?: boolean
  source: "sidebar" | "navbar" | "shared"
  notes?: string
}

function normalizeHref(href: string) {
  const [path] = href.split("?")
  const normalized = path.replace(/\/$/, "")
  return normalized || "/"
}

export const dashboardRouteAuditEntries: readonly DashboardRouteAuditEntry[] = [
  { href: "/", readiness: "ready", source: "shared", required: true },
  { href: "/dashboard", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/streaming-studio", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/onboarding", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/projects/new", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/live-session", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/analytics", readiness: "ready", source: "sidebar", required: true },
  { href: "/analytics/streams", readiness: "ready", source: "sidebar" },
  {
    href: "/seller/analytics",
    readiness: "coming-soon",
    source: "sidebar",
    notes: "No app route exists yet.",
  },
  { href: "/ecommerce/analytics", readiness: "ready", source: "sidebar" },
  { href: "/upload", readiness: "ready", source: "sidebar", required: true },
  { href: "/recordings", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/alerts", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/account", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/settings", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/billing", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/create-project", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/library", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/usage", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/general", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/profile", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/refer", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/preferences", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/connections", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/templates", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/design-system", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/members", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/api", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/documentation", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/upgrade", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/feedback", readiness: "ready", source: "sidebar", required: true },
  {
    href: "/agents/dashboard",
    readiness: "coming-soon",
    source: "sidebar",
    required: true,
    notes: "No app/agents/dashboard/page.tsx route exists yet.",
  },
  { href: "/automation", readiness: "ready", source: "sidebar", required: true },
  { href: "/runashchat", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/chat", readiness: "ready", source: "shared", notes: "Legacy compatibility route; keep permanent redirect to /runashchat until legacy links are fully retired in a future major release." },
  { href: "/dashboard/runash-chat", readiness: "ready", source: "shared", notes: "Legacy compatibility route; keep permanent redirect to /runashchat until legacy links are fully retired in a future major release." },
  { href: "/chat", readiness: "ready", source: "shared", notes: "Legacy compatibility route; keep permanent redirect to /runashchat until legacy links are fully retired in a future major release." },
  { href: "/runash-chat", readiness: "ready", source: "shared", notes: "Legacy compatibility route; keep permanent redirect to /runashchat until legacy links are fully retired in a future major release." },
  { href: "/editor", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/editor", readiness: "ready", source: "shared", notes: "Legacy compatibility route; keep permanent redirect to /editor until legacy links are fully retired in a future major release." },
  { href: "/dashboard/seller-studio", readiness: "ready", source: "sidebar", required: true },
  { href: "/dashboard/store", readiness: "ready", source: "sidebar", required: true },
  { href: "/settings", readiness: "ready", source: "navbar", required: true },
  { href: "/settings/profile", readiness: "ready", source: "navbar", required: true },
  { href: "/settings/billing", readiness: "ready", source: "navbar", required: true },
  { href: "/stream?resume=last-live", readiness: "ready", source: "navbar" },
  { href: "/recordings?view=recent-edit", readiness: "ready", source: "navbar" },
  { href: "/dashboard/analytics?replay=last-live", readiness: "ready", source: "navbar" },
] as const

const dashboardRouteAuditByPath = new Map(
  dashboardRouteAuditEntries.map((entry) => [normalizeHref(entry.href), entry]),
)

export const dashboardReadyRoutes = new Set(
  dashboardRouteAuditEntries
    .filter((entry) => entry.readiness === "ready")
    .map((entry) => normalizeHref(entry.href)),
)

export function getDashboardRouteAuditEntry(href: string) {
  return dashboardRouteAuditByPath.get(normalizeHref(href))
}

export function getDashboardRouteReadiness(href: string): DashboardRouteReadiness {
  return getDashboardRouteAuditEntry(href)?.readiness ?? "coming-soon"
}

export function isDashboardRouteReady(href: string) {
  return getDashboardRouteReadiness(href) === "ready"
}

export function normalizeDashboardHref(href: string) {
  return normalizeHref(href)
}
