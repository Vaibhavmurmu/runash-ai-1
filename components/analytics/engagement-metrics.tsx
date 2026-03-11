"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, BarChart, ResponsiveContainer, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { AnalyticsFilters } from "@/types/analytics"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Clock, TrendingUp, Users } from "lucide-react"
import { AnalyticsService } from "@/lib/analytics-service"

type HistoricalResponse = {
  viewerCounts: Array<{ timestamp: string; value: number }>
  chatActivity: Array<{ timestamp: string; value: number }>
  followerGrowth: Array<{ timestamp: string; value: number }>
  revenue: Array<{ timestamp: string; value: number }>
  engagement: Array<{ timestamp: string; value: number }>
  watchTime: Array<{ timestamp: string; value: number }>
}

interface EngagementMetricsProps {
  filters: AnalyticsFilters
}

function getPeriodValue(filters: AnalyticsFilters): string {
  const period = (filters as any)?.period
  if (typeof period === "string") return period
  const label = typeof period?.label === "string" ? period.label.toLowerCase() : ""
  if (label.includes("24") || label.includes("1d")) return "1d"
  if (label.includes("7")) return "7d"
  if (label.includes("30")) return "30d"
  if (label.includes("90")) return "90d"
  if (label.includes("year") || label.includes("1y")) return "1y"
  return "30d"
}

export function EngagementMetrics({ filters }: EngagementMetricsProps) {
  const [data, setData] = useState<HistoricalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const service = AnalyticsService.getInstance()
        const payload = await service.getHistoricalAnalytics(getPeriodValue(filters), (filters as any)?.streamId, {
          platforms: filters.platforms,
          categories: filters.categories,
          streamTypes: filters.streamTypes,
        })
        if (!cancelled) {
          setData(payload)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load engagement analytics")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [filters])

  const computed = useMemo(() => {
    if (!data || data.viewerCounts.length === 0) return null

    const totalViewers = data.viewerCounts.reduce((sum, day) => sum + day.value, 0) || 1
    const totalChat = data.chatActivity.reduce((sum, day) => sum + day.value, 0)
    const totalWatchTime = data.watchTime.reduce((sum, day) => sum + day.value, 0)
    const avgEngagementRate = data.engagement.length
      ? data.engagement.reduce((sum, day) => sum + day.value, 0) / data.engagement.length
      : 0
    const avgRetentionRate = data.followerGrowth.length
      ? Math.min((data.followerGrowth.reduce((sum, day) => sum + day.value, 0) / data.followerGrowth.length) * 10, 100)
      : 0

    const topEngagementTimes = data.engagement
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => {
        const date = new Date(item.timestamp)
        return {
          time: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
          day: date.toLocaleDateString(undefined, { weekday: "long" }),
          engagementRate: Number(item.value.toFixed(1)),
        }
      })

    return {
      avgChatPerViewer: (totalChat / totalViewers).toFixed(2),
      avgWatchTimePerViewer: (totalWatchTime / totalViewers / 60).toFixed(1),
      avgEngagementRate: avgEngagementRate.toFixed(1),
      avgRetentionRate: avgRetentionRate.toFixed(1),
      topEngagementTimes,
    }
  }, [data])

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading engagement analytics…</div>
  }

  if (error) {
    return <div className="text-sm text-destructive">Unable to load engagement analytics: {error}</div>
  }

  if (!data || !computed || data.viewerCounts.length === 0) {
    return <div className="text-sm text-muted-foreground">No engagement data is available for the selected filters.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Chat Per Viewer</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{computed.avgChatPerViewer}</div><p className="text-xs text-muted-foreground">Average messages per viewer</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Watch Time</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{computed.avgWatchTimePerViewer} min</div><p className="text-xs text-muted-foreground">Per viewer</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Engagement Rate</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{computed.avgEngagementRate}%</div><p className="text-xs text-muted-foreground">Average across all streams</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Retention Rate</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{computed.avgRetentionRate}%</div><p className="text-xs text-muted-foreground">Estimated from selected period</p></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Chat Activity</CardTitle><CardDescription>Messages per day</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]"><ChartContainer config={{ chatActivity: { label: "Chat Messages", color: "hsl(var(--chart-1))" } }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.chatActivity.slice(-14)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" tickFormatter={(value) => { const date = new Date(value); return `${date.getDate()}/${date.getMonth() + 1}` }} /><YAxis /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" name="chatActivity" fill="var(--color-chatActivity)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Engagement Rate</CardTitle><CardDescription>Viewer interaction percentage</CardDescription></CardHeader>
          <CardContent><div className="h-[300px]"><ChartContainer config={{ engagementRate: { label: "Engagement Rate (%)", color: "hsl(var(--chart-2))" } }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.engagement.slice(-14)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" tickFormatter={(value) => { const date = new Date(value); return `${date.getDate()}/${date.getMonth() + 1}` }} /><YAxis tickFormatter={(value) => `${value}%`} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="value" name="engagementRate" stroke="var(--color-engagementRate)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></ChartContainer></div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Engagement Times</CardTitle><CardDescription>When your audience is most active</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {computed.topEngagementTimes.map((item) => (
              <div key={`${item.time}-${item.day}`} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div><div className="font-medium">{item.time}</div><div className="text-sm text-muted-foreground">{item.day}</div></div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{item.engagementRate}% engagement</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
