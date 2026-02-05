"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, DollarSign, TrendingUp, AlertTriangle } from "lucide-react"
import type { Product } from "@/lib/repositories/products"

interface ProductStatsProps {
  products: Product[]
}

export function ProductStats({ products }: ProductStatsProps) {
  const totalProducts = products.length
  const inStockProducts = products.filter((p) => p.in_stock).length
  const outOfStockProducts = totalProducts - inStockProducts
  const featuredProducts = products.filter((p) => p.featured).length
  const totalValue = products.reduce((sum, p) => sum + p.price * p.inventory_count, 0)
  const totalSales = products.reduce((sum, p) => sum + p.sales_count, 0)
  const averagePrice = totalProducts > 0 ? products.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0

  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
      icon: Package,
      description: `${featuredProducts} featured`,
      trend: "+12% from last month",
    },
    {
      title: "Inventory Value",
      value: `$${totalValue.toLocaleString()}`,
      icon: DollarSign,
      description: `Avg. $${averagePrice.toFixed(2)}`,
      trend: "+8% from last month",
    },
    {
      title: "Total Sales",
      value: totalSales,
      icon: TrendingUp,
      description: "This month",
      trend: "+23% from last month",
    },
    {
      title: "Stock Status",
      value: inStockProducts,
      icon: AlertTriangle,
      description: `${outOfStockProducts} out of stock`,
      trend: outOfStockProducts > 0 ? "Needs attention" : "All good",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            <div className="flex items-center mt-2">
              <Badge
                variant={
                  stat.trend.includes("+") ? "default" : stat.trend.includes("attention") ? "destructive" : "secondary"
                }
                className="text-xs"
              >
                {stat.trend}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
