"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, DollarSign, Eye, TrendingUp, TrendingDown } from "lucide-react"
import { useEffect, useState } from "react"

interface Metric {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ElementType
  color: string
}

export function RealTimeMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      title: "Live Viewers",
      value: "2,847",
      change: "+12%",
      trend: "up",
      icon: Eye,
      color: "text-blue-500",
    },
    {
      title: "Active Agents",
      value: "8",
      change: "+2",
      trend: "up",
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Revenue/Hour",
      value: "$342",
      change: "+8%",
      trend: "up",
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: "Conversion Rate",
      value: "3.2%",
      change: "-0.1%",
      trend: "down",
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value:
            metric.title === "Live Viewers"
              ? `${(Math.floor(Math.random() * 500) + 2500).toLocaleString()}`
              : metric.value,
        })),
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className={`h-4 w-4 ${metric.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="flex items-center gap-1 text-xs">
              {metric.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>{metric.change}</span>
              <span className="text-muted-foreground">from last hour</span>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/20 to-primary/40" />
        </Card>
      ))}
    </div>
  )
}
