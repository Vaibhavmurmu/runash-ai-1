"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RevenueChart } from "./revenue-chart"
import { StreamPerformanceChart } from "./stream-performance-chart"
import { AIAgentMetrics } from "./ai-agent-metrics"
import { ProductAutomationChart } from "./product-automation-chart"
import { RealTimeMetrics } from "./real-time-metrics"
import { ConversionFunnelChart } from "./conversion-funnel-chart"
import { GeographicDistribution } from "./geographic-distribution"
import { CustomerInsights } from "./customer-insights"

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <RealTimeMetrics />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="streams">Streams</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <RevenueChart />
            <StreamPerformanceChart />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ConversionFunnelChart />
            <GeographicDistribution />
          </div>
        </TabsContent>

        <TabsContent value="streams" className="space-y-6">
          <div className="grid gap-6">
            <StreamPerformanceChart />
            <Card>
              <CardHeader>
                <CardTitle>Stream Analytics Details</CardTitle>
                <CardDescription>Detailed performance metrics for all streams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Top Performing Streams</h4>
                    <div className="space-y-2">
                      {[
                        { name: "Organic Skincare Live", viewers: 2847, revenue: "$1,234" },
                        { name: "Wellness Wednesday", viewers: 1923, revenue: "$892" },
                        { name: "Product Launch Event", viewers: 1654, revenue: "$756" },
                      ].map((stream, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <span className="font-medium">{stream.name}</span>
                          <div className="text-sm text-muted-foreground">
                            {stream.viewers} viewers • {stream.revenue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Stream Categories</h4>
                    <div className="space-y-2">
                      {[
                        { category: "Skincare", count: 12, percentage: 35 },
                        { category: "Wellness", count: 8, percentage: 24 },
                        { category: "Nutrition", count: 7, percentage: 21 },
                        { category: "Fitness", count: 7, percentage: 20 },
                      ].map((cat, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${cat.percentage}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground">{cat.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <AIAgentMetrics />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <ProductAutomationChart />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <CustomerInsights />
        </TabsContent>
      </Tabs>
    </div>
  )
}
