"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"

const streamData = [
  { name: "Skincare Live", viewers: 2847, engagement: 85, revenue: 1234, duration: 120 },
  { name: "Wellness Wed", viewers: 1923, engagement: 78, revenue: 892, duration: 90 },
  { name: "Product Launch", viewers: 1654, engagement: 92, revenue: 756, duration: 150 },
  { name: "Nutrition Talk", viewers: 1432, engagement: 71, revenue: 543, duration: 75 },
  { name: "Fitness Friday", viewers: 1287, engagement: 88, revenue: 678, duration: 105 },
  { name: "Beauty Tips", viewers: 1156, engagement: 82, revenue: 445, duration: 60 },
]

const chartConfig = {
  viewers: {
    label: "Viewers",
    color: "hsl(var(--chart-1))",
  },
  engagement: {
    label: "Engagement %",
    color: "hsl(var(--chart-2))",
  },
}

export function StreamPerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream Performance</CardTitle>
        <CardDescription>Viewer count and engagement rates by stream</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streamData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar yAxisId="left" dataKey="viewers" fill="var(--color-viewers)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="engagement" fill="var(--color-engagement)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
