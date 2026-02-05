"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2 } from "lucide-react"
import type { Product } from "@/lib/repositories/products"

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateProduct: (product: Partial<Product>) => Promise<{ data: any; error: string | null }>
  userId?: string
}

const categories = [
  "Skincare",
  "Makeup",
  "Haircare",
  "Supplements",
  "Wellness",
  "Fashion",
  "Electronics",
  "Home & Garden",
  "Sports & Fitness",
  "Books & Media",
]

export function CreateProductDialog({ open, onOpenChange, onCreateProduct, userId }: CreateProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    inventory_count: "",
    in_stock: true,
    featured: false,
    image_url: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    try {
      const productData: Partial<Product> = {
        user_id: userId,
        name: formData.name,
        description: formData.description || null,
        price: Number.parseFloat(formData.price),
        category: formData.category,
        inventory_count: Number.parseInt(formData.inventory_count) || 0,
        in_stock: formData.in_stock,
        featured: formData.featured,
        image_url: formData.image_url || null,
        sales_count: 0,
      }

      const { error } = await onCreateProduct(productData)

      if (!error) {
        onOpenChange(false)
        setFormData({
          name: "",
          description: "",
          price: "",
          category: "",
          inventory_count: "",
          in_stock: true,
          featured: false,
          image_url: "",
        })
      }
    } catch (error) {
      console.error("Error creating product:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Create a new product for your catalog and live streams.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your product..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory Count</Label>
              <Input
                id="inventory"
                type="number"
                min="0"
                value={formData.inventory_count}
                onChange={(e) => setFormData({ ...formData, inventory_count: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Product Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="image"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="in-stock">In Stock</Label>
                <div className="text-sm text-muted-foreground">Product is available for purchase</div>
              </div>
              <Switch
                id="in-stock"
                checked={formData.in_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="featured">Featured Product</Label>
                <div className="text-sm text-muted-foreground">Highlight this product in streams</div>
              </div>
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


