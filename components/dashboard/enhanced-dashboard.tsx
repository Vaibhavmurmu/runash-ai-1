"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, ArrowRight, BarChart3, RefreshCw, ShieldAlert, ShoppingBag, Video } from "lucide-react"
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
    <Card className="border-border/50 bg-card/70">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  )
}

function ActivityPanel({ items }: { items: DashboardActivity[] }) {
  return (
    <Card className="h-full border-border/50 bg-card/70">
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>Latest customer and stream events relevant to your role.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No new activity yet.</p>
        ) : (
          items.slice(0, 6).map((activity, index) => (
            <div key={activity.id ?? `${activity.action}-${index}`} className="rounded-lg border border-border/40 p-3">
              <p className="text-sm">
                <span className="font-medium">{activity.user?.name ?? "System"}</span>{" "}
                <span className="text-muted-foreground">{activity.action ?? "updated"}</span>{" "}
                {activity.target ? <span className="font-medium">{activity.target}</span> : null}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{activity.time ?? "Just now"}</span>
                <Badge variant="outline" className="text-[10px] uppercase">
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
    <Card className="border-border/50 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{block.title}</CardTitle>
          <CardDescription>{block.description}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{block.statLabel}</p>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{block.statValue}</p>
          {streamError ? (
            <p className="mt-2 text-xs text-destructive">{streamError}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{roleConfig.subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-brand-gradient hover:opacity-95">
            <Link href={block.ctaHref}>
              {block.ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={block.helperHref}>{block.helperLabel}</Link>
          </Button>
        </div>
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

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setStreamWidgetError(null)

      const me = await fetchApiData<{ role?: string } | null>("/api/me", {
        fallbackMessage: "Failed to load current user",
      }).catch(() => null)
      setRole(resolveDashboardRole(me?.role))

      const [statsData, activityData] = await Promise.all([
        fetchApiData<DashboardStats>("/api/dashboard/stats", {
          fallbackMessage: "Failed to load dashboard stats",
        }),
        fetchApiData<DashboardActivity[]>("/api/dashboard/activity?limit=8", {
          fallbackMessage: "Failed to load dashboard activity",
        }),
      ])

      setStats(statsData ?? {})
      setActivities(Array.isArray(activityData) ? activityData : [])

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{roleConfig.title}</h1>
          <p className="text-sm text-muted-foreground">Compact dashboard focused on your current workflow.</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {role}
        </Badge>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <SummaryCard key={item.id} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PrimaryWorkflowPanel
            role={role}
            stats={stats}
            streamError={streamWidgetError}
            onRefresh={() => void loadDashboardData()}
          />
        </div>
        <div className="lg:col-span-2">
          <ActivityPanel items={activities} />
        </div>
      </section>

      <details className="rounded-lg border border-border/50 bg-card/60 p-4">
        <summary className="cursor-pointer text-sm font-medium">More modules and routes</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {roleConfig.expandedRouteLinks.map((item) => (
            <Button key={item.href} asChild variant="outline" className="justify-between">
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
