"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Search, Filter, Edit, Trash2, Package, TrendingUp, Star, ShoppingCart, Upload } from "lucide-react"
import useSWR from "swr"
import { useToast } from "@/hooks/use-toast"

type Product = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  category: string | null
  status: "active" | "out_of_stock" | "draft"
  rating: number
  sales: number
  image: string | null
  row_version: number
}

const fetcher = (url: string) =>
  fetch(url, { headers: { "x-user-id": "1" } }).then((r) => {
    if (!r.ok) throw new Error("Failed to load products")
    return r.json()
  })

export function ProductManager() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newProductCategory, setNewProductCategory] = useState<string | undefined>()

  const { data: productsData = [], mutate, isLoading } = useSWR<Product[]>(
    `/api/products?q=${encodeURIComponent(searchTerm)}&category=${selectedCategory}`,
    fetcher,
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "out_of_stock":
        return "bg-red-500"
      case "draft":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active"
      case "out_of_stock":
        return "Out of Stock"
      case "draft":
        return "Draft"
      default:
        return "Unknown"
    }
  }

  const filteredProducts = productsData.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  async function handleCreate() {
    try {
      const name = (document.getElementById("product-name") as HTMLInputElement)?.value
      const description = (document.getElementById("product-description") as HTMLTextAreaElement)?.value
      const price = Number((document.getElementById("product-price") as HTMLInputElement)?.value || 0)
      const stock = Number((document.getElementById("product-stock") as HTMLInputElement)?.value || 0)

      if (!name?.trim()) {
        toast({ title: "Name required", description: "Please enter a product name.", variant: "destructive" })
        return
      }

      const optimistic: Product = {
        id: -Date.now(),
        name,
        description: description || null,
        price,
        stock,
        category: newProductCategory || (selectedCategory === "all" ? null : selectedCategory),
        status: stock > 0 ? "active" : "out_of_stock",
        rating: 0,
        sales: 0,
        image: null,
        row_version: 0,
      }
      await mutate([optimistic, ...productsData], { revalidate: false })

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json", "x-user-id": "1" },
        body: JSON.stringify({
          name,
          description,
          price,
          stock,
          category: optimistic.category,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to create product")
      }

      const created = (await res.json()) as Product
      await mutate(
        (current = []) => [created, ...current.filter((item) => item.id !== optimistic.id)],
        { revalidate: false },
      )
      setIsCreateDialogOpen(false)
      setNewProductCategory(undefined)
      toast({ title: "Product created", description: "Your product has been added." })
    } catch (e: any) {
      await mutate()
      toast({ title: "Error", description: e.message || "Could not create product.", variant: "destructive" })
    }
  }

  async function handleDelete(product: Product) {
    const previous = productsData
    await mutate(
      (current = []) => current.filter((item) => item.id !== product.id),
      { revalidate: false },
    )

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
        headers: { "x-user-id": "1", "if-match": `"${product.row_version}"` },
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to delete product")
      }
      toast({ title: "Product deleted", description: "The product was removed." })
    } catch (e: any) {
      await mutate(previous, { revalidate: false })
      toast({ title: e.message.includes("Conflict") ? "Delete conflict" : "Error", description: e.message, variant: "destructive" })
      await mutate()
    }
  }

  async function handleToggleStatus(product: Product) {
    const nextStatus: Product["status"] = product.status === "active" ? "draft" : "active"
    const previous = productsData
    await mutate(
      (current = []) => current.map((item) => (item.id === product.id ? { ...item, status: nextStatus } : item)),
      { revalidate: false },
    )

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-user-id": "1" },
        body: JSON.stringify({ status: nextStatus, row_version: product.row_version }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to update product")
      }
      const updated = (await res.json()) as Product
      await mutate(
        (current = []) => current.map((item) => (item.id === product.id ? updated : item)),
        { revalidate: false },
      )
      toast({ title: "Product updated", description: `Status changed to ${getStatusText(nextStatus)}.` })
    } catch (e: any) {
      await mutate(previous, { revalidate: false })
      toast({ title: e.message.includes("Conflict") ? "Update conflict" : "Error", description: e.message, variant: "destructive" })
      await mutate()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Manager</h2>
          <p className="text-muted-foreground">Manage your organic product inventory</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Add a new organic product to your inventory</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Product Name</Label>
                  <Input id="product-name" placeholder="Enter product name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-category">Category</Label>
                  <Select value={newProductCategory} onValueChange={setNewProductCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                      <SelectItem value="fruits">Fruits</SelectItem>
                      <SelectItem value="herbs">Herbs & Spices</SelectItem>
                      <SelectItem value="dairy">Dairy Products</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea id="product-description" placeholder="Describe your product..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product-price">Price</Label>
                  <Input id="product-price" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-stock">Stock Quantity</Label>
                  <Input id="product-stock" type="number" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select defaultValue="kg">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">per kg</SelectItem>
                      <SelectItem value="piece">per piece</SelectItem>
                      <SelectItem value="bunch">per bunch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Product Images</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="organic-certified" />
                <Label htmlFor="organic-certified">Organic Certified</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500" onClick={handleCreate}>
                  Add Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="vegetables">Vegetables</SelectItem>
            <SelectItem value="fruits">Fruits</SelectItem>
            <SelectItem value="herbs">Herbs & Spices</SelectItem>
            <SelectItem value="dairy">Dairy Products</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline"><Filter className="h-4 w-4 mr-2" />More Filters</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Products</p><p className="text-2xl font-bold">{productsData.length}</p></div><Package className="h-8 w-8 text-orange-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Products</p><p className="text-2xl font-bold">{productsData.filter((p) => p.status === "active").length}</p></div><TrendingUp className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Out of Stock</p><p className="text-2xl font-bold">{productsData.filter((p) => p.status === "out_of_stock").length}</p></div><Package className="h-8 w-8 text-red-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Sales</p><p className="text-2xl font-bold">{productsData.reduce((sum, p) => sum + p.sales, 0)}</p></div><ShoppingCart className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div>Loading...</div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <Card key={product.id} className="border-0 shadow-lg bg-white/80 backdrop-blur overflow-hidden">
              <div className="aspect-square bg-gray-100 relative">
                <img src={product.image || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                <Badge className={`absolute top-2 right-2 ${getStatusColor(product.status)} text-white`}>{getStatusText(product.status)}</Badge>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="text-sm">{product.rating}</span></div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-orange-600">${product.price}</p><p className="text-sm text-muted-foreground">Stock: {product.stock}</p></div><div className="text-right"><p className="text-sm font-medium">{product.sales} sold</p><p className="text-xs text-muted-foreground">this month</p></div></div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={() => handleToggleStatus(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {product.status === "active" ? "Move to draft" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(product)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur"><CardContent className="p-12 text-center"><Package className="h-12 w-12 mx-auto text-gray-400 mb-4" /><h3 className="text-lg font-semibold mb-2">No products found</h3><p className="text-muted-foreground mb-4">{searchTerm || selectedCategory !== "all" ? "Try adjusting your search or filters" : "Start by adding your first product"}</p><Button className="bg-gradient-to-r from-orange-500 to-amber-500" onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Product</Button></CardContent></Card>
        )}
      </div>
    </div>
  )
}
