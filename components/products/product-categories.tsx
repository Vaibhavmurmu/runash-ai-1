"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Package, DollarSign, TrendingUp } from "lucide-react"
import type { Database } from "@/lib/supabase/types"

type Product = Database["public"]["Tables"]["products"]["Row"]

interface ProductCategoriesProps {
  products: Product[]
}

export function ProductCategories({ products }: ProductCategoriesProps) {
  const categoryStats = products.reduce(
    (acc, product) => {
      const category = product.category
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalValue: 0,
          totalSales: 0,
          inStock: 0,
        }
      }
      acc[category].count++
      acc[category].totalValue += product.price * product.inventory_count
      acc[category].totalSales += product.sales_count
      if (product.in_stock) acc[category].inStock++
      return acc
    },
    {} as Record<string, { count: number; totalValue: number; totalSales: number; inStock: number }>,
  )

  const totalProducts = products.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Category Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(categoryStats).map(([category, stats]) => {
              const percentage = (stats.count / totalProducts) * 100
              const stockPercentage = (stats.inStock / stats.count) * 100

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{category}</h3>
                      <Badge variant="secondary">{stats.count} products</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}% of catalog</span>
                  </div>

                  <Progress value={percentage} className="h-2" />

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {stats.inStock}/{stats.count} in stock
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${stats.totalValue.toLocaleString()} value</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>{stats.totalSales} sales</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Stock level:</span>
                    <Progress value={stockPercentage} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">{stockPercentage.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
