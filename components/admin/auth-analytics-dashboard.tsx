"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  BarChart,
  PieChart,
  ResponsiveContainer,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Shield, Users, AlertTriangle, Activity, Globe, TrendingUp, TrendingDown, Eye, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { AuthAnalyticsData, AuthEvent } from "@/lib/auth-analytics"

type AuthSecurityHealthMetrics = {
  windowMinutes: number
  counters: {
    failedAuth: number
    forbiddenAccess: number
    sessionRevokes: number
  }
  previousWindow: {
    failedAuth: number
    forbiddenAccess: number
    sessionRevokes: number
  }
  spikes: {
    failedAuth: number
    forbiddenAccess: number
    sessionRevokes: number
  }
  thresholds: {
    failedAuth: number
    forbiddenAccess: number
    sessionRevokes: number
    spikePercent: number
  }
  alerts: Array<{
    metric: string
    severity: "normal" | "medium" | "high"
    triggered: boolean
    reason: string
  }>
}

export default function AuthAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AuthAnalyticsData | null>(null)
  const [recentEvents, setRecentEvents] = useState<AuthEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  })
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [securityHealth, setSecurityHealth] = useState<AuthSecurityHealthMetrics | null>(null)

  useEffect(() => {
    fetchAnalytics()
    fetchRecentEvents()
    fetchSecurityHealth()
  }, [dateRange])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAnalytics()
        fetchRecentEvents()
        fetchSecurityHealth()
      }, 30000) // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, dateRange])

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      })
      const response = await fetch(`/api/admin/analytics/auth?${params}`)
      const data = await response.json()

      if (response.ok) {
        setAnalyticsData(data)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch analytics",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentEvents = async () => {
    try {
      const response = await fetch("/api/admin/analytics/auth/events?limit=20")
      const data = await response.json()

      if (response.ok) {
        setRecentEvents(data)
      }
    } catch (error) {
      console.error("Failed to fetch recent events:", error)
    }
  }

  const fetchSecurityHealth = async () => {
    try {
      const response = await fetch("/api/admin/analytics/auth/metrics?windowMinutes=60")
      const data = await response.json()

      if (response.ok) {
        setSecurityHealth(data.metrics)
      }
    } catch (error) {
      console.error("Failed to fetch security health:", error)
    }
  }

  const getEventTypeColor = (eventType: string, success: boolean) => {
    if (!success) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"

    switch (eventType) {
      case "login":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "register":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "password_reset":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  if (loading || !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Authentication Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
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
          <h1 className="text-3xl font-bold">Authentication Analytics</h1>
          <p className="text-muted-foreground">Monitor authentication activities and security metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}
          </Button>
          <Button
            onClick={() => {
              fetchAnalytics()
              fetchRecentEvents()
              fetchSecurityHealth()
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.realTimeMetrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.realTimeMetrics.currentSessions}</div>
            <p className="text-xs text-muted-foreground">Open sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.loginAttempts.successRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analyticsData.loginAttempts.successRate >= 90 ? (
                <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
              )}
              <span>
                {analyticsData.loginAttempts.successful}/{analyticsData.loginAttempts.total} attempts
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.securityEvents.reduce((sum, event) => sum + event.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Auth & Security Health Monitoring</CardTitle>
          <CardDescription>
            Failed auth, forbidden access, and session revoke telemetry with spike alerts (60-minute window)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityHealth ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Failed Auth</div>
                  <div className="text-2xl font-semibold">{securityHealth.counters.failedAuth}</div>
                  <div className="text-xs text-muted-foreground">
                    Spike: {securityHealth.spikes.failedAuth}% • Threshold: {securityHealth.thresholds.failedAuth}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Forbidden Access</div>
                  <div className="text-2xl font-semibold">{securityHealth.counters.forbiddenAccess}</div>
                  <div className="text-xs text-muted-foreground">
                    Spike: {securityHealth.spikes.forbiddenAccess}% • Threshold: {securityHealth.thresholds.forbiddenAccess}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Session Revokes</div>
                  <div className="text-2xl font-semibold">{securityHealth.counters.sessionRevokes}</div>
                  <div className="text-xs text-muted-foreground">
                    Spike: {securityHealth.spikes.sessionRevokes}% • Threshold: {securityHealth.thresholds.sessionRevokes}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Active Alerts</div>
                {securityHealth.alerts.filter((alert) => alert.triggered).length === 0 ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                    No suspicious spikes detected.
                  </div>
                ) : (
                  securityHealth.alerts
                    .filter((alert) => alert.triggered)
                    .map((alert) => (
                      <div
                        key={alert.metric}
                        className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
                      >
                        <span className="font-medium">{alert.metric}:</span> {alert.reason.replaceAll("_", " ")}
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading security health metrics…</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="methods">Auth Methods</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Activity</CardTitle>
                <CardDescription>Daily login and registration trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ChartContainer
                    config={{
                      logins: {
                        label: "Logins",
                        color: "hsl(var(--chart-1))",
                      },
                      registrations: {
                        label: "Registrations",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.userActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="logins"
                          name="logins"
                          stroke="var(--color-logins)"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="registrations"
                          name="registrations"
                          stroke="var(--color-registrations)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>Login attempts by device type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.deviceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="device"
                        label={({ device, percentage }) => `${device}: ${percentage.toFixed(1)}%`}
                      >
                        {analyticsData.deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}`, "Count"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Methods</CardTitle>
              <CardDescription>Distribution of successful login methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ChartContainer
                  config={{
                    count: {
                      label: "Count",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.authMethods}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" name="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Login attempts by country</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.geographicData.map((country, index) => (
                  <div key={country.country} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{country.country}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {country.logins} logins ({country.percentage}%)
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full"
                        style={{ width: `${country.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>Security incidents and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.securityEvents.length > 0 ? (
                  analyticsData.securityEvents.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <div>
                          <div className="font-medium">{event.type.replace("_", " ").toUpperCase()}</div>
                          <div className="text-sm text-muted-foreground">{event.count} incidents</div>
                        </div>
                      </div>
                      <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No security events detected</p>
                    <p className="text-sm">Your authentication system is secure</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Authentication Events</CardTitle>
              <CardDescription>Latest authentication activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getEventTypeColor(event.event_type, event.success)}>{event.event_type}</Badge>
                        {!event.success && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div>
                        <div className="font-medium">
                          {(event as any).email || `User ${event.user_id || "Unknown"}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.ip_address} • {new Date(event.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
