"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"

const funnelData = [
  { stage: "Stream Views", count: 15420, percentage: 100, color: "hsl(var(--chart-1))" },
  { stage: "Product Interest", count: 4626, percentage: 30, color: "hsl(var(--chart-2))" },
  { stage: "Add to Cart", count: 1388, percentage: 9, color: "hsl(var(--chart-3))" },
  { stage: "Checkout", count: 694, percentage: 4.5, color: "hsl(var(--chart-4))" },
  { stage: "Purchase", count: 493, percentage: 3.2, color: "hsl(var(--chart-5))" },
]

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
}

export function ConversionFunnelChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Customer journey from stream view to purchase</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="horizontal" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="stage" type="category" className="text-xs" width={70} />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm">Count: {data.count.toLocaleString()}</p>
                        <p className="text-sm">Conversion: {data.percentage}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              {funnelData.map((entry, index) => (
                <Bar key={index} dataKey="count" fill={entry.color} radius={[0, 4, 4, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          {funnelData.map((stage, index) => (
            <div key={index} className="space-y-1">
              <div className="text-xs text-muted-foreground">{stage.stage}</div>
              <div className="font-medium">{stage.percentage}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
