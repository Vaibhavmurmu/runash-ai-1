"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from "recharts"
import { Badge } from "@/components/ui/badge"

const productData = [
  { category: "Skincare", automated: 45, manual: 12, efficiency: 78, revenue: 12400 },
  { category: "Wellness", automated: 38, manual: 8, efficiency: 82, revenue: 9800 },
  { category: "Nutrition", automated: 32, manual: 15, efficiency: 68, revenue: 8600 },
  { category: "Fitness", automated: 28, manual: 9, efficiency: 75, revenue: 7200 },
  { category: "Beauty", automated: 25, manual: 6, efficiency: 80, revenue: 6500 },
]

const automationTrends = [
  { week: "Week 1", automated: 120, efficiency: 65, cost_savings: 1200 },
  { week: "Week 2", automated: 135, efficiency: 68, cost_savings: 1350 },
  { week: "Week 3", automated: 148, efficiency: 72, cost_savings: 1480 },
  { week: "Week 4", automated: 162, efficiency: 75, cost_savings: 1620 },
  { week: "Week 5", automated: 178, efficiency: 78, cost_savings: 1780 },
  { week: "Week 6", automated: 195, efficiency: 82, cost_savings: 1950 },
]

const chartConfig = {
  automated: {
    label: "Automated",
    color: "hsl(var(--chart-1))",
  },
  manual: {
    label: "Manual",
    color: "hsl(var(--chart-2))",
  },
  efficiency: {
    label: "Efficiency %",
    color: "hsl(var(--chart-3))",
  },
}

export function ProductAutomationChart() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Automation by Category</CardTitle>
            <CardDescription>Automated vs manual product management across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="automated" stackId="a" fill="var(--color-automated)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="manual" stackId="a" fill="var(--color-manual)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation Efficiency Trends</CardTitle>
            <CardDescription>Weekly automation progress and efficiency improvements</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={automationTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar yAxisId="left" dataKey="automated" fill="var(--color-automated)" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="efficiency"
                    stroke="var(--color-efficiency)"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Automation Insights</CardTitle>
          <CardDescription>Detailed breakdown of automation performance and cost savings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <h4 className="font-semibold">Top Automated Workflows</h4>
              {[
                { name: "Inventory Sync", status: "active", savings: "$450/week" },
                { name: "Price Updates", status: "active", savings: "$320/week" },
                { name: "Product Descriptions", status: "active", savings: "$280/week" },
                { name: "Image Optimization", status: "scheduled", savings: "$200/week" },
              ].map((workflow, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-1">
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-sm text-muted-foreground">{workflow.savings}</div>
                  </div>
                  <Badge variant={workflow.status === "active" ? "default" : "secondary"}>{workflow.status}</Badge>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Efficiency Metrics</h4>
              <div className="space-y-3">
                {[
                  { metric: "Time Saved", value: "32 hours/week", trend: "+15%" },
                  { metric: "Error Reduction", value: "94%", trend: "+8%" },
                  { metric: "Cost Savings", value: "$1,250/week", trend: "+22%" },
                  { metric: "Process Speed", value: "3.2x faster", trend: "+12%" },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.metric}</span>
                    <div className="text-right">
                      <div className="font-medium">{item.value}</div>
                      <div className="text-xs text-green-500">{item.trend}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Upcoming Automations</h4>
              {[
                { name: "Customer Segmentation", eta: "2 days", impact: "High" },
                { name: "Review Management", eta: "1 week", impact: "Medium" },
                { name: "Social Media Posts", eta: "2 weeks", impact: "High" },
                { name: "Email Campaigns", eta: "3 weeks", impact: "Medium" },
              ].map((automation, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-1">
                    <div className="font-medium">{automation.name}</div>
                    <div className="text-sm text-muted-foreground">ETA: {automation.eta}</div>
                  </div>
                  <Badge variant={automation.impact === "High" ? "default" : "secondary"}>{automation.impact}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
