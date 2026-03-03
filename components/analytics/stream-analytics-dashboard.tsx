"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, DollarSign, Clock, Filter, RefreshCw } from "lucide-react"
import { AnalyticsOverview } from "./analytics-overview"
import { AudienceInsights } from "./audience-insights"
import { RevenueAnalytics } from "./revenue-analytics"
import { EngagementMetrics } from "./engagement-metrics"
import { StreamHealth } from "./stream-health"
import { AnalyticsPeriodSelector } from "./analytics-period-selector"
import { AnalyticsFilters } from "./analytics-filters"
import { AnalyticsExport } from "./analytics-export"
import { AIInsightsPanel } from "./ai-insights-panel"
import { ComparativeAnalytics } from "./comparative-analytics"
import useSWR from "swr"
import { AnalyticsService } from "@/lib/analytics-service"

interface StreamAnalyticsDashboardProps {
  streamId?: string
  isLive?: boolean
}

const analyticsService = AnalyticsService.getInstance()

const fetchOverview = (period: string, streamId?: string) => analyticsService.getOverviewAnalytics(period, streamId)

export function StreamAnalyticsDashboard({ streamId, isLive = false }: StreamAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { data: overview } = useSWR(["analytics-overview", selectedPeriod, streamId], ([, period, scopedStreamId]) =>
    fetchOverview(period, scopedStreamId),
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const quickStats = [
    {
      title: "Total Views",
      value: overview ? overview.totalViews.toLocaleString() : "—",
      change: overview ? `${overview.change.views > 0 ? "+" : ""}${overview.change.views}%` : "—",
      trend: overview && overview.change.views >= 0 ? ("up" as const) : ("down" as const),
      icon: Users,
    },
    {
      title: "Revenue",
      value: overview ? `$${Number(overview.revenue).toLocaleString()}` : "—",
      change: overview ? `${overview.change.revenue > 0 ? "+" : ""}${overview.change.revenue}%` : "—",
      trend: overview && overview.change.revenue >= 0 ? ("up" as const) : ("down" as const),
      icon: DollarSign,
    },
    {
      title: "Avg. Watch Time",
      value: overview ? `${Math.round((overview.avgWatchTimeSeconds || 0) / 60)}m` : "—",
      change: overview ? `${overview.change.watch > 0 ? "+" : ""}${overview.change.watch}%` : "—",
      trend: overview && overview.change.watch >= 0 ? ("up" as const) : ("down" as const),
      icon: Clock,
    },
    {
      title: "Engagement Rate",
      value: overview ? `${Number(overview.engagementRate).toFixed(1)}%` : "—",
      change: overview ? `${overview.change.engagement > 0 ? "+" : ""}${overview.change.engagement}%` : "—",
      trend: overview && overview.change.engagement >= 0 ? ("up" as const) : ("down" as const),
      icon: TrendingUp,
    },
  ]

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stream Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into your live shopping performance</p>
        </div>
        <div className="flex items-center space-x-2">
          {isLive && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
              Live
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AnalyticsExport />
        </div>
      </div>

      {/* Period Selector and Filters */}
      <div className="flex items-center justify-between">
        <AnalyticsPeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
        {showFilters && <AnalyticsFilters onFiltersChange={(filters) => console.log(filters)} />}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className={`text-sm ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {stat.change} from last period
                  </p>
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="health">Stream Health</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverview period={selectedPeriod} isLive={isLive} />
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <AudienceInsights period={selectedPeriod} />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueAnalytics period={selectedPeriod} />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <EngagementMetrics period={selectedPeriod} />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <StreamHealth streamId={streamId} />
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <ComparativeAnalytics />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <AIInsightsPanel period={selectedPeriod} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
