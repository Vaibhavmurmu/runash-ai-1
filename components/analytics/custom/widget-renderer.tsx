"use client"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { DashboardWidget } from "@/types/custom-dashboard"
import type { WidgetAnalyticsPoint } from "@/types/analytics"
import { ArrowUpRight, ArrowDownRight, Users, Eye, MessageSquare, DollarSign } from "lucide-react"

interface WidgetRendererProps {
  widget: DashboardWidget
  isEditMode?: boolean
  series?: WidgetAnalyticsPoint[]
  isLoading?: boolean
  fetchError?: string | null
}

const CHART_COLORS = ["#9146FF", "#FF0000", "#1877F2", "#16A34A", "#F59E0B", "#000000"]

function formatMetricValue(metricKey: string | undefined, value: number) {
  if (metricKey === "revenue") return `$${value.toLocaleString()}`
  if (metricKey === "engagement") return `${value.toFixed(1)}%`
  return value.toLocaleString()
}

export function WidgetRenderer({ widget, isEditMode, series = [], isLoading = false, fetchError = null }: WidgetRendererProps) {
  const hasSeries = series.length > 0
  const metricValue = hasSeries ? series[series.length - 1]?.value ?? 0 : 0
  const previousValue = series.length > 1 ? series[series.length - 2]?.value ?? 0 : metricValue
  const metricDelta = previousValue === 0 ? 0 : ((metricValue - previousValue) / previousValue) * 100

  const renderNoData = (message = "No analytics data available for current widget filters") => (
    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">{message}</div>
  )

  const renderMetricCard = () => {
    const metrics = {
      viewers: { icon: Eye, label: "Total Viewers" },
      followers: { icon: Users, label: "New Followers" },
      engagement: { icon: MessageSquare, label: "Engagement Rate" },
      revenue: { icon: DollarSign, label: "Revenue" },
    }

    const metric = metrics[widget.config.metric as keyof typeof metrics] || metrics.viewers

    return (
      <>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
          <metric.icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-bold">{formatMetricValue(widget.config.metric, metricValue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metricDelta >= 0 ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-rose-500" />
                )}
                <span className={metricDelta >= 0 ? "text-emerald-500" : "text-rose-500"}>{Math.abs(metricDelta).toFixed(1)}%</span>
                <span className="ml-1">from last period</span>
              </div>
            </>
          )}
        </CardContent>
      </>
    )
  }

  const renderLineChart = () => (
    <>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && <CardDescription>{widget.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-full min-h-[200px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !hasSeries ? (
            renderNoData()
          ) : (
            <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--chart-1))" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="value" name="value" stroke="var(--color-value)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </>
  )

  const renderBarChart = () => (
    <>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && <CardDescription>{widget.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-full min-h-[200px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !hasSeries ? (
            renderNoData()
          ) : (
            <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--chart-1))" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </>
  )

  const renderPieChart = () => (
    <>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && <CardDescription>{widget.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-full min-h-[200px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !hasSeries ? (
            renderNoData()
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={series}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="label"
                  label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                >
                  {series.map((entry, index) => (
                    <Cell key={`${entry.label}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [String(value), "Value"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </>
  )

  const renderAreaChart = () => (
    <>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && <CardDescription>{widget.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-full min-h-[200px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !hasSeries ? (
            renderNoData()
          ) : (
            <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--chart-1))" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" name="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </>
  )

  const renderDefault = () => (
    <>
      <CardHeader>
        <CardTitle>{widget.title}</CardTitle>
        {widget.description && <CardDescription>{widget.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground">
          {isEditMode ? <p className="text-sm">Configure this widget to display data</p> : <Skeleton className="h-full w-full" />}
        </div>
      </CardContent>
    </>
  )

  if (fetchError && !hasSeries && !isLoading) {
    return (
      <>
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
        <CardContent>{renderNoData(`Unable to load analytics: ${fetchError}`)}</CardContent>
      </>
    )
  }

  switch (widget.type) {
    case "metric-card":
    case "custom-metric":
      return renderMetricCard()
    case "line-chart":
      return renderLineChart()
    case "bar-chart":
      return renderBarChart()
    case "pie-chart":
      return renderPieChart()
    case "area-chart":
      return renderAreaChart()
    default:
      return renderDefault()
  }
}
