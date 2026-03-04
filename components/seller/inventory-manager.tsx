"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Bolt, Package, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react"

type InventoryProduct = {
  id: number
  name: string
  stock: number
  price: number
  row_version: number
}

type InventoryRecommendation = {
  id: string
  recommendation_type: "low_stock_prediction" | "reorder_recommendation" | "fulfillment_priority"
  recommendation_title: string
  recommendation_payload: {
    productName?: string
    daysToStockout?: number
    suggestedReorderQty?: number
    priorityScore?: number
    reason?: string
  }
  confidence_score: number
  status: "pending" | "approved" | "applied" | "dismissed"
}

const recommendationLabelMap: Record<InventoryRecommendation["recommendation_type"], string> = {
  low_stock_prediction: "Low-stock prediction",
  reorder_recommendation: "Reorder",
  fulfillment_priority: "Fulfillment priority",
}

export function InventoryManager() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [stockDrafts, setStockDrafts] = useState<Record<number, number>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [applyingRecommendationId, setApplyingRecommendationId] = useState<string | null>(null)
  const [refreshingRecommendations, setRefreshingRecommendations] = useState(false)

  const {
    data: products = [],
    error,
    mutate,
    isLoading,
  } = useSWR<InventoryProduct[]>("/api/products", (url) =>
    fetch(url).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error("Failed to fetch products")),
    ),
  )

  const {
    data: recommendationEnvelope,
    mutate: mutateRecommendations,
    isLoading: isRecommendationsLoading,
  } = useSWR<{ recommendations: InventoryRecommendation[] }>(
    "/api/seller/inventory/automation/recommendations",
    (url) =>
      fetch(url, { headers: { "x-user-id": "1" } }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("Failed to fetch inventory recommendations")),
      ),
  )

  const recommendations = recommendationEnvelope?.recommendations ?? []

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm],
  )

  const handleUpdateStock = async (product: InventoryProduct) => {
    const newStock = stockDrafts[product.id]
    if (newStock == null || Number.isNaN(newStock)) return

    setSavingId(product.id)
    const previousProducts = products
    const optimisticProducts = products.map((item) =>
      item.id === product.id ? { ...item, stock: newStock } : item,
    )

    await mutate(optimisticProducts, { revalidate: false })

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock, row_version: product.row_version }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to update stock")
      }

      const updated = (await response.json()) as InventoryProduct
      await mutate(
        (current = []) => current.map((item) => (item.id === product.id ? updated : item)),
        { revalidate: false },
      )

      setStockDrafts((prev) => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
      toast({ title: "Stock updated", description: "Product stock has been updated." })
    } catch (error: any) {
      await mutate(previousProducts, { revalidate: false })
      toast({
        title: error?.message?.includes("Conflict") ? "Update conflict" : "Error",
        description: error?.message || "Failed to update stock.",
        variant: "destructive",
      })
      await mutate()
    } finally {
      setSavingId(null)
    }
  }

  const handleDeleteProduct = async (product: InventoryProduct) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    const previousProducts = products
    await mutate(
      (current = []) => current.filter((item) => item.id !== product.id),
      { revalidate: false },
    )

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
        headers: { "if-match": `"${product.row_version}"` },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to delete product")
      }
      toast({ title: "Product deleted", description: "The product has been removed." })
    } catch (error: any) {
      await mutate(previousProducts, { revalidate: false })
      toast({
        title: error?.message?.includes("Conflict") ? "Delete conflict" : "Error",
        description: error?.message || "Failed to delete product.",
        variant: "destructive",
      })
      await mutate()
    }
  }

  const handleRefreshRecommendations = async () => {
    setRefreshingRecommendations(true)
    try {
      const response = await fetch("/api/seller/inventory/automation/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "1" },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to refresh recommendations")
      }

      await mutateRecommendations()
      toast({ title: "Forecast refreshed", description: "Inventory recommendations were recalculated." })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to refresh recommendations",
        variant: "destructive",
      })
    } finally {
      setRefreshingRecommendations(false)
    }
  }

  const handleApplyRecommendation = async (recommendationId: string) => {
    setApplyingRecommendationId(recommendationId)

    try {
      const response = await fetch(
        `/api/seller/inventory/automation/recommendations/${recommendationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": "1" },
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to apply recommendation")
      }

      await Promise.all([mutateRecommendations(), mutate()])
      toast({ title: "Recommendation applied", description: "Action has been logged and applied." })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to apply recommendation",
        variant: "destructive",
      })
    } finally {
      setApplyingRecommendationId(null)
    }
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Inventory Management
            </CardTitle>
            <CardDescription>Inline stock updates and low-inventory monitoring</CardDescription>
          </div>
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-background/80 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI inventory automation
              </h3>
              <p className="text-xs text-muted-foreground">Low-stock forecasts, reorder guidance, and fulfillment priority suggestions.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleRefreshRecommendations} disabled={refreshingRecommendations}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {refreshingRecommendations ? "Refreshing..." : "Recalculate"}
            </Button>
          </div>

          {isRecommendationsLoading && <div className="text-xs text-muted-foreground">Loading recommendations…</div>}
          {!isRecommendationsLoading && recommendations.length === 0 && (
            <div className="text-xs text-muted-foreground">No pending recommendations. Recalculate to generate a fresh forecast.</div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-2">
              {recommendations.slice(0, 8).map((recommendation) => (
                <div key={recommendation.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{recommendationLabelMap[recommendation.recommendation_type]}</Badge>
                        <span className="text-xs text-muted-foreground">Confidence {(recommendation.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-sm font-medium">{recommendation.recommendation_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {recommendation.recommendation_type === "low_stock_prediction" &&
                          `Estimated stockout in ${recommendation.recommendation_payload.daysToStockout ?? "N/A"} days.`}
                        {recommendation.recommendation_type === "reorder_recommendation" &&
                          `Suggested reorder quantity: ${recommendation.recommendation_payload.suggestedReorderQty ?? 0}.`}
                        {recommendation.recommendation_type === "fulfillment_priority" &&
                          (recommendation.recommendation_payload.reason || "Prioritize this SKU in fulfillment queue.")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApplyRecommendation(recommendation.id)}
                      disabled={recommendation.status === "applied" || applyingRecommendationId === recommendation.id}
                    >
                      <Bolt className="h-4 w-4 mr-1" />
                      {recommendation.status === "applied" ? "Applied" : "One-click apply"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        {error && <div className="text-sm text-red-500">Unable to load inventory.</div>}
        {isLoading && <div className="text-sm text-muted-foreground">Loading inventory…</div>}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const draft = stockDrafts[product.id]
                const effectiveStock = draft ?? product.stock
                const dirty = draft != null && draft !== product.stock
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={effectiveStock}
                        onChange={(e) =>
                          setStockDrafts((prev) => ({ ...prev, [product.id]: Number.parseInt(e.target.value || "0", 10) }))
                        }
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      {effectiveStock > 10 ? (
                        <Badge className="bg-green-100 text-green-800">In Stock</Badge>
                      ) : effectiveStock > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStock(product)}
                        disabled={!dirty || savingId === product.id}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
