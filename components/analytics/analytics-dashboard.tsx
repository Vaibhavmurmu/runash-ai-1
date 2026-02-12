"use client"

import { type ReactNode, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from "@/lib/hooks/use-auth"
import { useAnalytics } from "@/lib/hooks/use-analytics"
import { useStreams } from "@/lib/hooks/use-streams"
import { useProducts } from "@/lib/hooks/use-products"
import { useAIAgents } from "@/lib/hooks/use-ai-agents"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { Activity, Bot, PlayCircle, TrendingUp, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

const chartConfig = {
  viewers: { label: "Viewers", color: "hsl(var(--chart-1))" },
  revenue: { label: "Revenue", color: "hsl(var(--chart-2))" },
  streams: { label: "Streams", color: "hsl(var(--chart-3))" },
}

export function AnalyticsDashboard() {
  const { user } = useAuth()
  const userId = user?.id

  const { dailyAnalytics, totals, loading: analyticsLoading, error: analyticsError } = useAnalytics(userId)
  const { streams, loading: streamsLoading, error: streamsError } = useStreams(userId)
  const { products, loading: productsLoading, error: productsError } = useProducts(userId)
  const { agents, loading: agentsLoading, error: agentsError } = useAIAgents(userId)

  const loading = analyticsLoading || streamsLoading || productsLoading || agentsLoading
  const error = analyticsError || streamsError || productsError || agentsError

  const dailyChartData = useMemo(
    () =>
      dailyAnalytics.map((day) => ({
        date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: day.total_revenue,
        viewers: day.total_viewers,
        streams: day.total_streams,
      })),
    [dailyAnalytics],
  )

  const topStreams = useMemo(
    () => [...streams].sort((a, b) => (b.max_viewers || 0) - (a.max_viewers || 0)).slice(0, 5),
    [streams],
  )

  const streamCategories = useMemo(() => {
    const total = streams.length
    const categoryMap = streams.reduce<Record<string, number>>((acc, stream) => {
      const key = stream.category || "Uncategorized"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return Object.entries(categoryMap)
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [streams])

  const productCategoryCounts = useMemo(() => {
    return Object.entries(
      products.reduce<Record<string, number>>((acc, product) => {
        const key = product.category || "Uncategorized"
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
    )
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [products])

  const activeAgents = agents.filter((agent) => agent.enabled).length

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Unable to load analytics data.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Revenue" value={formatCurrency(totals.revenue)} />
        <MetricCard icon={<Users className="h-4 w-4" />} label="Viewers" value={formatNumber(totals.viewers)} />
        <MetricCard icon={<PlayCircle className="h-4 w-4" />} label="Streams" value={formatNumber(totals.streams)} />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Engagement"
          value={`${Number(totals.engagement || 0).toFixed(1)}%`}
        />
        <MetricCard icon={<Bot className="h-4 w-4" />} label="Active Agents" value={formatNumber(activeAgents)} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="streams">Streams</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Revenue and viewers from your analytics feed.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="viewers" fill="var(--color-viewers)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Streams</CardTitle>
              <CardDescription>Ranked by peak viewers from live stream records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topStreams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between rounded border p-2">
                    <span className="font-medium">{stream.title}</span>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber(stream.max_viewers)} viewers • {formatCurrency(stream.total_revenue || 0)}
                    </div>
                  </div>
                ))}
                {!loading && topStreams.length === 0 && <p className="text-sm text-muted-foreground">No streams yet.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stream Categories</CardTitle>
              <CardDescription>Distribution from existing stream metadata.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {streamCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span>{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground">{cat.count}</span>
                    </div>
                  </div>
                ))}
                {!loading && streamCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground">No category data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Status</CardTitle>
              <CardDescription>Live status from your AI agents dataset.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {agents.slice(0, 8).map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between rounded border p-2">
                    <span className="font-medium">{agent.name}</span>
                    <Badge variant={agent.enabled ? "default" : "secondary"}>{agent.status}</Badge>
                  </div>
                ))}
                {!loading && agents.length === 0 && <p className="text-sm text-muted-foreground">No agents found.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Categories</CardTitle>
              <CardDescription>Catalog distribution from product records.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {productCategoryCounts.map((entry) => (
                  <div key={entry.category} className="flex items-center justify-between rounded border p-2">
                    <span>{entry.category}</span>
                    <span className="text-sm text-muted-foreground">{entry.count} products</span>
                  </div>
                ))}
                {!loading && productCategoryCounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No product data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Insights</CardTitle>
              <CardDescription>Derived from viewer and conversion metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InsightTile label="Total Viewers" value={formatNumber(totals.viewers)} />
                <InsightTile label="Avg Engagement" value={`${Number(totals.engagement || 0).toFixed(1)}%`} />
                <InsightTile
                  label="Revenue per Stream"
                  value={totals.streams > 0 ? formatCurrency(totals.revenue / totals.streams) : formatCurrency(0)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function InsightTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
