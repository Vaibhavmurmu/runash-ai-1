"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  BarChart,
  PieChart,
  ResponsiveContainer,
  Line,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Download, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { EmailAnalyticsData } from "@/lib/email-analytics"

interface RealTimeMetrics {
  emails_sent_today: number
  current_open_rate: number
  active_campaigns: number
  recent_activity: Array<{ type: string; message: string; timestamp: string }>
}

interface AnalyticsFilters {
  date_from: string
  date_to: string
  campaign_id?: string
  template_id?: string
}

function buildQuery(filters: AnalyticsFilters) {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
  })

  if (filters.campaign_id) params.set("campaign_id", filters.campaign_id)
  if (filters.template_id) params.set("template_id", filters.template_id)

  return params.toString()
}

export function EmailAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<EmailAnalyticsData | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
  const [campaignId, setCampaignId] = useState<string>("all")
  const [templateId, setTemplateId] = useState<string>("all")
  const { toast } = useToast()

  const filters = useMemo<AnalyticsFilters>(
    () => ({
      date_from: dateRange.from.toISOString(),
      date_to: dateRange.to.toISOString(),
      campaign_id: campaignId === "all" ? undefined : campaignId,
      template_id: templateId === "all" ? undefined : templateId,
    }),
    [campaignId, dateRange.from, dateRange.to, templateId],
  )

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const query = buildQuery(filters)

      const [analyticsRes, realtimeRes, broadcastsRes, linksRes] = await Promise.all([
        fetch(`/api/admin/email-analytics?${query}`),
        fetch("/api/admin/email-analytics/realtime"),
        fetch(`/api/admin/email-analytics/broadcasts?${query}`),
        fetch(`/api/admin/email-analytics/links?${query}`),
      ])

      if (!analyticsRes.ok || !realtimeRes.ok || !broadcastsRes.ok || !linksRes.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const [analyticsData, realtimeData, broadcastsData, linksData] = await Promise.all([
        analyticsRes.json(),
        realtimeRes.json(),
        broadcastsRes.json(),
        linksRes.json(),
      ])

      setAnalytics({
        ...analyticsData.data,
        broadcast_funnels: broadcastsData.data,
        top_links: linksData.data,
      })
      setRealTimeMetrics(realtimeData.data)
    } catch (error) {
      console.error("Error fetching analytics:", error)
      toast({
        title: "Error",
        description: "Failed to fetch email analytics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = async (report: "broadcasts" | "links" | "templates" | "segments") => {
    try {
      const query = buildQuery(filters)
      const res = await fetch(`/api/admin/email-analytics/export?report=${report}&${query}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `email-analytics-${report}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting csv:", error)
      toast({ title: "Export failed", description: "Unable to export CSV", variant: "destructive" })
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [filters])

  if (loading || !analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const deviceColors = { Mobile: "#ff6b35", Desktop: "#f7931e", Tablet: "#ffb366" }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-3xl font-bold text-transparent">
            Email Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">Funnel, links, template trends, and segment performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerWithRange date={dateRange} onDateChange={(range) => range && setDateRange(range)} />
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Broadcast" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All broadcasts</SelectItem>
              {analytics.broadcast_funnels?.map((item) => (
                <SelectItem key={item.broadcast_id} value={String(item.broadcast_id)}>
                  {item.broadcast_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {analytics.templates.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
        </div>
      </div>

      {realTimeMetrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm">Today's Emails</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{realTimeMetrics.emails_sent_today.toLocaleString()}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Current Open Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{realTimeMetrics.current_open_rate.toFixed(1)}%</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Active Campaigns</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{realTimeMetrics.active_campaigns}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Events / hour</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{realTimeMetrics.recent_activity.length}</CardContent></Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Sent</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{analytics.overview.total_sent.toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Delivered</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{analytics.overview.delivery_rate.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Opened</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{analytics.overview.open_rate.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Clicked</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{analytics.overview.click_rate.toFixed(1)}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Unsubscribed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{analytics.overview.unsubscribe_rate.toFixed(1)}%</CardContent></Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="broadcasts">Broadcast Funnel</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="links">Top Links</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader><CardTitle>Daily Performance</CardTitle></CardHeader>
            <CardContent className="h-[320px]">
              <ChartContainer config={{ sent: { label: "Sent", color: "hsl(var(--chart-1))" }, opened: { label: "Opened", color: "hsl(var(--chart-2))" }, clicked: { label: "Clicked", color: "hsl(var(--chart-3))" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trends.daily_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="var(--color-sent)" />
                    <Line type="monotone" dataKey="opened" stroke="var(--color-opened)" />
                    <Line type="monotone" dataKey="clicked" stroke="var(--color-clicked)" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcasts" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportCsv("broadcasts")}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Per-Broadcast Funnel</CardTitle><CardDescription>Sent → delivered → opened → clicked</CardDescription></CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.broadcast_funnels || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="broadcast_name" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="#f97316" />
                  <Bar dataKey="delivered" fill="#fb923c" />
                  <Bar dataKey="opened" fill="#fdba74" />
                  <Bar dataKey="clicked" fill="#fed7aa" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportCsv("templates")}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Template Performance Over Time</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {analytics.template_performance_over_time?.slice(0, 12).map((entry) => (
                <div key={`${entry.template_id}-${entry.bucket_date}`} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div><p className="font-medium">{entry.template_name}</p><p className="text-muted-foreground">{entry.bucket_date}</p></div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{entry.sent} sent</Badge>
                    <Badge variant="secondary">{entry.open_rate.toFixed(1)}% open</Badge>
                    <Badge>{entry.click_rate.toFixed(1)}% click</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportCsv("segments")}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Audience Segment Comparison</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {analytics.audience_segment_comparison?.map((segment) => (
                <div key={segment.segment} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-medium capitalize">{segment.segment}</p>
                    <p className="text-xs text-muted-foreground">{segment.total_sent} total sent</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{segment.delivery_rate.toFixed(1)}% delivered</p>
                    <p>{segment.open_rate.toFixed(1)}% opened</p>
                    <p>{segment.click_rate.toFixed(1)}% clicked</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => exportCsv("links")}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          </div>
          <Card>
            <CardHeader><CardTitle>Top Clicked Links</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {analytics.top_links?.map((link) => (
                <div key={link.url} className="flex items-center justify-between rounded border p-3">
                  <div className="max-w-[70%] truncate text-sm text-muted-foreground">{link.url}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{link.total_clicks} clicks</Badge>
                    <Badge variant="secondary">{link.unique_clicks} unique</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Device Usage</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.devices} dataKey="opens" nameKey="device_type" cx="50%" cy="50%" outerRadius={80}>
                  {analytics.devices.map((entry, index) => (
                    <Cell key={index} fill={deviceColors[entry.device_type as keyof typeof deviceColors]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Subject Lines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analytics.top_performing.subject_lines.slice(0, 5).map((subject) => (
              <div key={subject.subject} className="flex items-center justify-between rounded border p-2 text-sm">
                <span className="max-w-[70%] truncate">{subject.subject}</span>
                <Badge variant="outline">{subject.open_rate.toFixed(1)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
