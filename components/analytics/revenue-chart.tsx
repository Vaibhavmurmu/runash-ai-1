"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"

const revenueData = [
  { date: "Jan 1", revenue: 1200, target: 1000, streams: 5 },
  { date: "Jan 2", revenue: 1800, target: 1200, streams: 7 },
  { date: "Jan 3", revenue: 1600, target: 1400, streams: 6 },
  { date: "Jan 4", revenue: 2200, target: 1600, streams: 8 },
  { date: "Jan 5", revenue: 2800, target: 1800, streams: 10 },
  { date: "Jan 6", revenue: 2400, target: 2000, streams: 9 },
  { date: "Jan 7", revenue: 3200, target: 2200, streams: 12 },
  { date: "Jan 8", revenue: 2900, target: 2400, streams: 11 },
  { date: "Jan 9", revenue: 3600, target: 2600, streams: 14 },
  { date: "Jan 10", revenue: 4100, target: 2800, streams: 16 },
  { date: "Jan 11", revenue: 3800, target: 3000, streams: 15 },
  { date: "Jan 12", revenue: 4500, target: 3200, streams: 18 },
  { date: "Jan 13", revenue: 4200, target: 3400, streams: 17 },
  { date: "Jan 14", revenue: 4800, target: 3600, streams: 19 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  target: {
    label: "Target",
    color: "hsl(var(--chart-2))",
  },
}

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Analytics</CardTitle>
        <CardDescription>Daily revenue vs targets over the last 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-target)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-target)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="target"
                stackId="1"
                stroke="var(--color-target)"
                fill="url(#colorTarget)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="2"
                stroke="var(--color-revenue)"
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
