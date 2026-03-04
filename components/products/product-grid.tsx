"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit, Trash2, Star, Package, DollarSign, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Product } from "@/lib/repositories/products"

interface ProductGridProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onView: (product: Product) => void
}

export function ProductGrid({ products, onEdit, onDelete, onView }: ProductGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card key={product.id} className="group hover:shadow-lg transition-shadow">
          <CardHeader className="p-0">
            <div className="relative aspect-square overflow-hidden rounded-t-lg">
              <img
                src={product.image_url || "/placeholder.svg?height=200&width=200"}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {product.featured && (
                <Badge className="absolute top-2 left-2 bg-yellow-500 hover:bg-yellow-600">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {!product.in_stock && (
                <Badge variant="destructive" className="absolute top-2 right-2">
                  Out of Stock
                </Badge>
              )}

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(product)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Product
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-sm line-clamp-2 flex-1">{product.name}</h3>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">${product.price}</span>
                <Badge variant="secondary" className="text-xs">
                  {product.category}
                </Badge>
              </div>

              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{product.inventory_count} in stock</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{product.sales_count} sold</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs bg-transparent">
                  Add to Stream
                </Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
