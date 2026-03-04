"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Package, TrendingUp, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useDashboardModelDialog } from "@/components/dashboard/model-dialog-provider"

interface InventoryItem {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  reserved: number
  lastUpdated: string
  trend: "up" | "down" | "stable"
  reorderLevel: number
}

export function StoreWorkspace() {
  const { openFromTrigger } = useDashboardModelDialog()
  const [inventory] = useState<InventoryItem[]>([
    {
      id: "1",
      name: "Premium Silk Blouse",
      sku: "PSB-001",
      price: 89.99,
      stock: 42,
      reserved: 8,
      lastUpdated: "now",
      trend: "down",
      reorderLevel: 20,
    },
    {
      id: "2",
      name: "Classic Denim Jacket",
      sku: "CDJ-002",
      price: 129.99,
      stock: 15,
      reserved: 5,
      lastUpdated: "2 min ago",
      trend: "up",
      reorderLevel: 25,
    },
    {
      id: "3",
      name: "Summer Linen Dress",
      sku: "SLD-003",
      price: 79.99,
      stock: 3,
      reserved: 12,
      lastUpdated: "now",
      trend: "down",
      reorderLevel: 15,
    },
    {
      id: "4",
      name: "Leather Accessories Pack",
      sku: "LAP-004",
      price: 49.99,
      stock: 67,
      reserved: 2,
      lastUpdated: "5 min ago",
      trend: "stable",
      reorderLevel: 10,
    },
  ])

  const [recentOrders] = useState([
    { id: "#ORD-28741", customer: "Sarah Chen", total: "$234.50", status: "shipped", time: "2 min ago" },
    { id: "#ORD-28740", customer: "Marcus Johnson", total: "$156.75", status: "processing", time: "5 min ago" },
    { id: "#ORD-28739", customer: "Emma Williams", total: "$89.99", status: "delivered", time: "12 min ago" },
    { id: "#ORD-28738", customer: "Alex Rodriguez", total: "$423.20", status: "pending", time: "18 min ago" },
  ])

  const stats = [
    { label: "Total Stock Value", value: "$24,580.50", change: "+2.3%", icon: Package },
    { label: "Orders Today", value: "127", change: "+12.5%", icon: TrendingUp },
    { label: "Low Stock Items", value: "3", change: "-1", icon: AlertCircle },
    { label: "Reserved Items", value: "27", change: "+5.2%", icon: Zap },
  ]

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.stock - item.reserved <= item.reorderLevel),
    [inventory],
  )

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="bg-brand-gradient text-xs shadow-sm transition-opacity hover:opacity-95"
            onClick={(event) =>
              openFromTrigger(
                {
                  triggerSource: "store",
                  mode: "configure",
                  model: {
                    modelId: "store-catalog-assistant",
                    provider: "RunAsh AI",
                    displayName: "Store Catalog Assistant",
                  },
                  payload: { prompt: "Recommend merchandising updates based on low inventory and recent order trends." },
                },
                event.currentTarget,
              )
            }
          >
            Catalog Assistant
          </Button>
          <Button
            variant="outline"
            className="text-xs hover:bg-muted/80"
            onClick={(event) =>
              openFromTrigger(
                {
                  triggerSource: "store",
                  mode: "execute",
                  model: {
                    modelId: "store-offer-generator",
                    provider: "RunAsh AI",
                    displayName: "Store Offer Generator",
                  },
                  payload: { prompt: "Generate limited-time offers for low-stock and slow-moving inventory." },
                },
                event.currentTarget,
              )
            }
          >
            Offer Generation
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Store operations dashboard</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Inventory, order flow, and replenishment controls in a single responsive workspace.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:bg-card/70">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{stat.change}</span>
              </div>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
            </Card>
          )
        })}
      </section>

      {lowStockItems.length > 0 ? (
        <Card className="border-orange-500/35 bg-orange-500/10 p-4 shadow-sm dark:bg-orange-500/15">
          <div className="flex flex-wrap items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600 dark:text-orange-300" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">Low stock alert</h3>
              <p className="mt-1 text-sm text-orange-800/90 dark:text-orange-200/90">
                {lowStockItems.length} {lowStockItems.length === 1 ? "item" : "items"} below reorder level.
              </p>
            </div>
            <Button className="bg-brand-gradient text-xs shadow-sm transition-opacity hover:opacity-95">Reorder queue</Button>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Live inventory</h2>
            <Button variant="outline" className="h-8 text-xs hover:bg-muted/80">
              Sync now
            </Button>
          </div>

          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm dark:bg-card/70">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">SKU</th>
                    <th className="px-4 py-3 text-right font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Reserved</th>
                    <th className="px-4 py-3 text-right font-medium">Available</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {inventory.map((item) => {
                    const available = item.stock - item.reserved
                    const statusVariant = available === 0 ? "destructive" : available <= item.reorderLevel ? "secondary" : "outline"

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.sku}</td>
                        <td className="px-4 py-3 text-right font-semibold">{item.stock}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{item.reserved}</td>
                        <td className="px-4 py-3 text-right font-semibold">{available}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusVariant} className="capitalize">
                            {available === 0 ? "Out" : available <= item.reorderLevel ? "Low" : "Good"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{item.lastUpdated}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent orders</h2>
          <Card className="divide-y divide-border/60 border-border/60 bg-card/80 shadow-sm dark:bg-card/70">
            {recentOrders.map((order) => {
              const statusVariant =
                order.status === "delivered"
                  ? "outline"
                  : order.status === "shipped"
                    ? "secondary"
                    : order.status === "processing"
                      ? "default"
                      : "outline"

              return (
                <div key={order.id} className="space-y-2 p-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{order.id}</p>
                    <Badge variant={statusVariant} className="capitalize">
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.customer}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">{order.total}</span>
                    <span className="text-muted-foreground">{order.time}</span>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </section>
    </div>
  )
}
