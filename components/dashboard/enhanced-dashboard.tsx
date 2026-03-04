"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, ArrowRight, BarChart3, MessageSquare, RefreshCw, ShieldAlert, ShoppingBag, Store, Video, WandSparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import {
  dashboardRoleViewConfig,
  resolveDashboardRole,
  type DashboardRolePreset,
} from "@/components/dashboard/dashboard-view-config"
import { useDashboardRealtime } from "@/lib/hooks/use-dashboard-realtime"
import { dashboardStreamingService } from "@/lib/streaming-service"
import { fetchApiData } from "@/lib/api/client"

type DashboardStats = Record<string, string | number | null | undefined>
type DashboardActivity = {
  id?: string
  type?: string
  action?: string
  target?: string
  time?: string
  user?: { name?: string }
}

type SellerSummary = {
  pendingOrders?: number
  outOfStock?: number
  recentStreams?: Array<{ id: string; title: string; date?: string; url?: string }>
}

type EditorProjectSummary = {
  id: string
  name?: string
  updated_at?: string
}

type ChatSessionSummary = {
  id: string
  title?: string
  created_at?: string
}

type ModuleCardData = {
  id: "streams" | "editor" | "chat" | "store" | "seller"
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  continuityLabel: string
  continuityHref: string
  continuityDisabled?: boolean
  lastUpdatedLabel: string
  icon: ComponentType<{ className?: string }>
}

function formatLastUpdated(value?: string | null) {
  if (!value) return "No recent updates"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return `Updated ${parsed.toLocaleString()}`
}

function formatStatValue(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return "—"
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)
  }

  return value
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/70">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground"><Icon className="h-4 w-4" /></span>
      </CardContent>
    </Card>
  )
}

function ActivityPanel({ items }: { items: DashboardActivity[] }) {
  return (
    <Card className="h-full border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/70">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>Latest customer and stream events relevant to your role.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new activity yet.</p>
        ) : (
          items.slice(0, 6).map((activity, index) => (
            <div key={activity.id ?? `${activity.action}-${index}`} className="rounded-xl border border-border/50 bg-background/30 p-3.5 transition-colors hover:border-border hover:bg-background/60">
              <p className="text-sm">
                <span className="font-medium">{activity.user?.name ?? "System"}</span>{" "}
                <span className="text-muted-foreground">{activity.action ?? "updated"}</span>{" "}
                {activity.target ? <span className="font-medium">{activity.target}</span> : null}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{activity.time ?? "Just now"}</span>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {activity.type ?? "event"}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function PrimaryWorkflowPanel({
  role,
  stats,
  streamError,
  onRefresh,
}: {
  role: DashboardRolePreset
  stats: DashboardStats
  streamError: string | null
  onRefresh: () => void
}) {
  const roleConfig = dashboardRoleViewConfig[role]

  const blocks = {
    creator: {
      title: "Creator workflow",
      description: "Start a live stream, publish drafts, and review post-stream quality in one flow.",
      ctaLabel: "Open streaming studio",
      ctaHref: "/dashboard/streaming-studio",
      helperHref: "/recordings",
      helperLabel: "Review recordings",
      statLabel: "Queued drafts",
      statValue: formatStatValue(stats.queuedDrafts),
      icon: Video,
    },
    seller: {
      title: "Seller workflow",
      description: "Monitor storefront health, launch offers, and keep checkout conversion stable.",
      ctaLabel: "Open seller studio",
      ctaHref: "/dashboard/seller-studio",
      helperHref: "/dashboard/store",
      helperLabel: "Manage store catalog",
      statLabel: "Abandoned checkouts",
      statValue: formatStatValue(stats.abandonedCarts),
      icon: ShoppingBag,
    },
    operator: {
      title: "Operations workflow",
      description: "Triaging alerts and service incidents is prioritized in this primary panel.",
      ctaLabel: "Open alerts queue",
      ctaHref: "/dashboard/alerts",
      helperHref: "/automation",
      helperLabel: "Inspect automation runbooks",
      statLabel: "Critical incidents",
      statValue: formatStatValue(stats.criticalIncidents),
      icon: ShieldAlert,
    },
  } as const

  const block = blocks[role]
  const Icon = block.icon

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg">{block.title}</CardTitle>
          <CardDescription>{block.description}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium hover:bg-muted/70" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{block.statLabel}</p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground"><Icon className="h-4 w-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{block.statValue}</p>
          {streamError ? (
            <p className="mt-2 text-xs text-destructive">{streamError}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{roleConfig.subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild className="bg-brand-gradient shadow-sm transition-opacity hover:opacity-95 focus-visible:ring-brand-ring">
            <Link href={block.ctaHref}>
              {block.ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="hover:bg-muted/80">
            <Link href={block.helperHref}>{block.helperLabel}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ModuleTemplateCard({ module }: { module: ModuleCardData }) {
  const Icon = module.icon

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/70">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{module.title}</CardTitle>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground"><Icon className="h-4 w-4" /></span>
        </div>
        <CardDescription>{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <Button asChild className="w-full bg-brand-gradient shadow-sm transition-opacity hover:opacity-95 focus-visible:ring-brand-ring">
          <Link href={module.primaryHref}>{module.primaryLabel}</Link>
        </Button>
        {module.continuityDisabled ? (
          <Button variant="outline" className="w-full" disabled>
            {module.continuityLabel}
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full hover:bg-muted/80">
            <Link href={module.continuityHref}>{module.continuityLabel}</Link>
          </Button>
        )}
        <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{module.lastUpdatedLabel}</div>
      </CardContent>
    </Card>
  )
}

export function EnhancedDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({})
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [streamWidgetError, setStreamWidgetError] = useState<string | null>(null)
  const [role, setRole] = useState<DashboardRolePreset>("creator")
  const [recentStream, setRecentStream] = useState<{ id: string; title?: string; date?: string; url?: string } | null>(null)
  const [latestEditorProject, setLatestEditorProject] = useState<EditorProjectSummary | null>(null)
  const [recentChatSession, setRecentChatSession] = useState<ChatSessionSummary | null>(null)
  const [sellerSummary, setSellerSummary] = useState<SellerSummary | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setStreamWidgetError(null)

      const me = await fetchApiData<{ role?: string } | null>("/api/me", {
        fallbackMessage: "Failed to load current user",
      }).catch(() => null)
      setRole(resolveDashboardRole(me?.role))

      const [statsData, activityData, streamData, projectData, chatData, sellerData] = await Promise.all([
        fetchApiData<DashboardStats>("/api/dashboard/stats", {
          fallbackMessage: "Failed to load dashboard stats",
        }),
        fetchApiData<DashboardActivity[]>("/api/dashboard/activity?limit=8", {
          fallbackMessage: "Failed to load dashboard activity",
        }),
        fetchApiData<{ streams?: Array<{ id: string; title?: string; date?: string; url?: string }> }>("/api/dashboard/streams?limit=1", {
          fallbackMessage: "Failed to load dashboard streams",
        }).catch(() => null),
        fetchApiData<{ projects?: EditorProjectSummary[] }>("/api/editor/projects", {
          fallbackMessage: "Failed to load editor projects",
        }).catch(() => null),
        fetchApiData<ChatSessionSummary>("/api/sessions/recent", {
          fallbackMessage: "Failed to load recent chat session",
        }).catch(() => null),
        fetchApiData<SellerSummary>("/api/seller/dashboard/summary", {
          fallbackMessage: "Failed to load seller summary",
        }).catch(() => null),
      ])

      setStats(statsData ?? {})
      setActivities(Array.isArray(activityData) ? activityData : [])
      setRecentStream(streamData?.streams?.[0] ?? null)
      setLatestEditorProject(projectData?.projects?.[0] ?? null)
      setRecentChatSession(chatData)
      setSellerSummary(sellerData)

      await dashboardStreamingService.fetchLatestCompletedStreamSummary().catch(() => null)
    } catch (error) {
      setStreamWidgetError(error instanceof Error ? error.message : "Failed to load dashboard")
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  useDashboardRealtime({
    onInvalidate: () => {
      void loadDashboardData()
    },
  })

  const roleConfig = dashboardRoleViewConfig[role]

  const summaryCards = useMemo(
    () =>
      roleConfig.summaryMetrics.map((metric) => ({
        ...metric,
        value: formatStatValue(stats[metric.statKey]),
      })),
    [roleConfig.summaryMetrics, stats],
  )

  const moduleCards = useMemo<ModuleCardData[]>(() => {
    const sellerRecentStream = sellerSummary?.recentStreams?.[0]

    return [
      {
        id: "streams",
        title: "Streams",
        description: "Go live quickly and jump back into your most recent stream setup.",
        primaryLabel: "Go Live",
        primaryHref: "/dashboard/streaming-studio",
        continuityLabel: recentStream?.id ? `Resume previous live: ${recentStream.title ?? "Untitled"}` : "Resume previous live",
        continuityHref: recentStream?.id ? `/stream?resumeStreamId=${encodeURIComponent(recentStream.id)}` : "/schedule",
        continuityDisabled: !recentStream?.id,
        lastUpdatedLabel: formatLastUpdated(recentStream?.date),
        icon: Video,
      },
      {
        id: "editor",
        title: "Editor",
        description: "Start a fresh edit or continue your latest project timeline.",
        primaryLabel: "New Project",
        primaryHref: "/dashboard/editor",
        continuityLabel: latestEditorProject?.id
          ? `Continue: ${latestEditorProject.name ?? "Untitled Project"}`
          : "Continue last project",
        continuityHref: latestEditorProject?.id
          ? `/dashboard/editor?projectId=${encodeURIComponent(latestEditorProject.id)}`
          : "/dashboard/editor",
        continuityDisabled: !latestEditorProject?.id,
        lastUpdatedLabel: formatLastUpdated(latestEditorProject?.updated_at),
        icon: WandSparkles,
      },
      {
        id: "chat",
        title: "Chat",
        description: "Start a new assistant conversation or continue your recent session context.",
        primaryLabel: "New Chat",
        primaryHref: "/dashboard/chat",
        continuityLabel: recentChatSession?.id
          ? `Continue: ${recentChatSession.title ?? "Recent session"}`
          : "Continue recent session",
        continuityHref: recentChatSession?.id
          ? `/dashboard/chat?sessionId=${encodeURIComponent(recentChatSession.id)}`
          : "/dashboard/chat",
        continuityDisabled: !recentChatSession?.id,
        lastUpdatedLabel: formatLastUpdated(recentChatSession?.created_at),
        icon: MessageSquare,
      },
      {
        id: "store",
        title: "Store",
        description: "Manage catalog state and pick up order/inventory operations quickly.",
        primaryLabel: "Open Store",
        primaryHref: "/dashboard/store",
        continuityLabel:
          (sellerSummary?.outOfStock ?? 0) > 0
            ? `Restock ${sellerSummary?.outOfStock ?? 0} low-stock item(s)`
            : "Continue order operations",
        continuityHref: (sellerSummary?.outOfStock ?? 0) > 0 ? "/dashboard/store?filter=low-stock" : "/dashboard/store?tab=orders",
        continuityDisabled: !sellerSummary,
        lastUpdatedLabel: formatLastUpdated(activities[0]?.time),
        icon: Store,
      },
      {
        id: "seller",
        title: "Seller",
        description: "Access seller controls and continue your most recent stream-linked workflow.",
        primaryLabel: "Open Seller Studio",
        primaryHref: "/dashboard/seller-studio",
        continuityLabel: sellerRecentStream?.id
          ? `Continue seller flow: ${sellerRecentStream.title ?? "Recent stream"}`
          : "Continue seller flow",
        continuityHref: sellerRecentStream?.id
          ? `/dashboard/seller-studio?streamId=${encodeURIComponent(sellerRecentStream.id)}`
          : "/dashboard/seller-studio",
        continuityDisabled: !sellerRecentStream?.id,
        lastUpdatedLabel: formatLastUpdated(sellerRecentStream?.date),
        icon: ShoppingBag,
      },
    ]
  }, [activities, latestEditorProject, recentChatSession, recentStream, sellerSummary])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{roleConfig.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Compact dashboard focused on your current workflow.</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {role}
        </Badge>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <SummaryCard key={item.id} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <PrimaryWorkflowPanel
            role={role}
            stats={stats}
            streamError={streamWidgetError}
            onRefresh={() => void loadDashboardData()}
          />
        </div>
        <div className="xl:col-span-2">
          <ActivityPanel items={activities} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map((module) => (
          <ModuleTemplateCard key={module.id} module={module} />
        ))}
      </section>

      <details className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-sm dark:bg-card/60">
        <summary className="cursor-pointer text-sm font-medium hover:text-foreground/90">More modules and routes</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {roleConfig.expandedRouteLinks.map((item) => (
            <Button key={item.href} asChild variant="outline" className="justify-between hover:bg-muted/80">
              <Link href={item.href} onClick={() => router.prefetch(item.href)}>
                {item.label}
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </Button>
          ))}
        </div>
      </details>
    </div>
  )
}
