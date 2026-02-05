"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { Badge } from "@/components/ui/badge"

const customerSegmentData = [
  { segment: "New Customers", count: 1247, percentage: 35, color: "hsl(var(--chart-1))" },
  { segment: "Returning Customers", count: 1568, percentage: 44, color: "hsl(var(--chart-2))" },
  { segment: "VIP Customers", count: 534, percentage: 15, color: "hsl(var(--chart-3))" },
  { segment: "Inactive Customers", count: 213, percentage: 6, color: "hsl(var(--chart-4))" },
]

const purchaseBehaviorData = [
  { timeSlot: "9-12 AM", purchases: 145, avgValue: 67 },
  { timeSlot: "12-3 PM", purchases: 234, avgValue: 89 },
  { timeSlot: "3-6 PM", purchases: 189, avgValue: 76 },
  { timeSlot: "6-9 PM", purchases: 312, avgValue: 94 },
  { timeSlot: "9-12 PM", purchases: 267, avgValue: 82 },
]

const topProducts = [
  { name: "Organic Face Serum", sales: 234, revenue: "$4,680", category: "Skincare" },
  { name: "Wellness Supplement Pack", sales: 189, revenue: "$3,780", category: "Wellness" },
  { name: "Natural Body Lotion", sales: 156, revenue: "$2,340", category: "Skincare" },
  { name: "Protein Powder", sales: 134, revenue: "$2,680", category: "Nutrition" },
  { name: "Yoga Mat Premium", sales: 98, revenue: "$1,960", category: "Fitness" },
]

export function CustomerInsights() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
            <CardDescription>Distribution of customer types</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={customerSegmentData} cx="50%" cy="50%" outerRadius={80} paddingAngle={5} dataKey="count">
                    {customerSegmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {customerSegmentData.map((segment, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="text-sm">{segment.segment}</span>
                  </div>
                  <div className="text-sm font-medium">{segment.count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Behavior by Time</CardTitle>
            <CardDescription>When customers are most likely to buy</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchaseBehaviorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timeSlot" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="purchases" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performing products across all streams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{product.sales} sales</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{product.revenue}</div>
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Lifetime Value</CardTitle>
            <CardDescription>Average value and engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {[
                { metric: "Average Order Value", value: "$87.50", change: "+12%" },
                { metric: "Customer Lifetime Value", value: "$342.80", change: "+8%" },
                { metric: "Repeat Purchase Rate", value: "34.2%", change: "+5%" },
                { metric: "Average Session Duration", value: "12m 34s", change: "+15%" },
                { metric: "Engagement Rate", value: "78.9%", change: "+3%" },
                { metric: "Churn Rate", value: "5.2%", change: "-2%" },
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">{item.metric}</span>
                  <div className="text-right">
                    <div className="font-bold">{item.value}</div>
                    <div
                      className={`text-xs ${item.change.startsWith("+") ? "text-green-500" : item.change.startsWith("-") ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      {item.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
