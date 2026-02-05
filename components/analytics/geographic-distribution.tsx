"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const geographicData = [
  { country: "United States", viewers: 4520, percentage: 45, revenue: "$12,400" },
  { country: "Canada", viewers: 1810, percentage: 18, revenue: "$4,800" },
  { country: "United Kingdom", viewers: 1206, percentage: 12, revenue: "$3,200" },
  { country: "Australia", viewers: 905, percentage: 9, revenue: "$2,400" },
  { country: "Germany", viewers: 603, percentage: 6, revenue: "$1,600" },
  { country: "Others", viewers: 1006, percentage: 10, revenue: "$2,700" },
]

export function GeographicDistribution() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Distribution</CardTitle>
        <CardDescription>Viewer distribution and revenue by country</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {geographicData.map((country, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">{country.country}</span>
              <div className="text-right">
                <div className="text-sm font-medium">{country.viewers.toLocaleString()} viewers</div>
                <div className="text-xs text-muted-foreground">{country.revenue}</div>
              </div>
            </div>
            <Progress value={country.percentage} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">{country.percentage}%</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
