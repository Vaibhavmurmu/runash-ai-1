"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, Grid3X3, List, Package } from "lucide-react"
import { useProducts } from "@/lib/hooks/use-products"
import { useAuthContext } from "@/components/auth/auth-provider"
import { ProductStats } from "./product-stats"
import { ProductGrid } from "./product-grid"
import { ProductList } from "./product-list"
import { CreateProductDialog } from "./create-product-dialog"
import { ProductFilters } from "./product-filters"
import { ProductCategories } from "./product-categories"
import { ProductAnalytics } from "./product-analytics"
import { ProductDetailDialog } from "./product-detail-dialog"
import type { Product } from "@/lib/repositories/products"

export function ProductsCatalog() {
  const { user } = useAuthContext()
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts(user?.id)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <ProductFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onClose={() => setShowFilters(false)}
        />
      )}

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          {/* Product Stats */}
          <ProductStats products={products} />

          {/* Products Display */}
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || selectedCategory !== "all"
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first product"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <ProductGrid
              products={filteredProducts}
              onEdit={(product) => console.log("Edit", product)}
              onDelete={(id) => deleteProduct(id)}
              onView={setSelectedProduct}
            />
          ) : (
            <ProductList
              products={filteredProducts}
              onEdit={(product) => console.log("Edit", product)}
              onDelete={(id) => deleteProduct(id)}
              onView={setSelectedProduct}
            />
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <ProductAnalytics products={products} />
        </TabsContent>

        <TabsContent value="categories">
          <ProductCategories products={products} />
        </TabsContent>
      </Tabs>

      {/* Create Product Dialog */}
      <CreateProductDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProduct={createProduct}
        userId={user?.id}
      />

      <ProductDetailDialog product={selectedProduct} open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)} />
    </div>
  )
}
