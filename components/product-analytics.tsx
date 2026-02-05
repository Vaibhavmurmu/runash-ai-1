"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Package, DollarSign } from "lucide-react"
import type { Database } from "@/lib/supabase/types"

type Product = Database["public"]["Tables"]["products"]["Row"]

interface ProductAnalyticsProps {
  products: Product[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function ProductAnalytics({ products }: ProductAnalyticsProps) {
  // Top performing products by sales
  const topProducts = products
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5)
    .map((product) => ({
      name: product.name.length > 20 ? product.name.substring(0, 20) + "..." : product.name,
      sales: product.sales_count,
      revenue: product.sales_count * product.price,
    }))

  // Category distribution
  const categoryData = products.reduce(
    (acc, product) => {
      const existing = acc.find((item) => item.name === product.category)
      if (existing) {
        existing.value++
      } else {
        acc.push({ name: product.category, value: 1 })
      }
      return acc
    },
    [] as { name: string; value: number }[],
  )

  // Price distribution
  const priceRanges = [
    { range: "$0-25", min: 0, max: 25 },
    { range: "$25-50", min: 25, max: 50 },
    { range: "$50-100", min: 50, max: 100 },
    { range: "$100+", min: 100, max: Number.POSITIVE_INFINITY },
  ]

  const priceDistribution = priceRanges.map((range) => ({
    range: range.range,
    count: products.filter((p) => p.price >= range.min && p.price < range.max).length,
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Sales",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                category: {
                  label: "Products",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Price Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Products",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Product Price</span>
                <Badge variant="secondary">
                  ${(products.reduce((sum, p) => sum + p.price, 0) / products.length || 0).toFixed(2)}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Total Inventory Value</span>
                <Badge variant="secondary">
                  ${products.reduce((sum, p) => sum + p.price * p.inventory_count, 0).toLocaleString()}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Best Selling Category</span>
                <Badge variant="default">{categoryData.sort((a, b) => b.value - a.value)[0]?.name || "N/A"}</Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Stock Coverage</span>
                <Badge
                  variant={
                    products.filter((p) => p.in_stock).length / products.length > 0.8 ? "default" : "destructive"
                  }
                >
                  {((products.filter((p) => p.in_stock).length / products.length) * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
