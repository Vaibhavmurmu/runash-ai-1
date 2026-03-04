'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, BarChart3, TrendingUp, ShoppingCart } from 'lucide-react';
import { useCommerceCartActions, useOrderHistoryData } from '@/hooks/use-commerce-data';

export default function HistoryPage() {
  const { data: orderHistory, loading, error } = useOrderHistoryData();
  const { addItemToCart } = useCommerceCartActions();

  const deliveredOrders = useMemo(() => orderHistory.filter((order) => order.status === 'delivered'), [orderHistory]);
  const totalSpent = useMemo(() => orderHistory.reduce((acc, order) => acc + Number(order.total || 0), 0), [orderHistory]);
  const averageOrder = orderHistory.length ? totalSpent / orderHistory.length : 0;

  if (loading) return <div className="container mx-auto px-4 py-8">Loading order history...</div>;
  if (error) return <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-muted-foreground mt-2">View all your past and current orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 space-y-2"><p className="text-3xl">📦</p><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{orderHistory.length}</p></Card>
          <Card className="p-4 space-y-2"><p className="text-3xl">💰</p><p className="text-sm text-muted-foreground">Total Spent</p><p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p></Card>
          <Card className="p-4 space-y-2"><p className="text-3xl">📊</p><p className="text-sm text-muted-foreground">Avg. Order Value</p><p className="text-2xl font-bold">${averageOrder.toFixed(2)}</p></Card>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {orderHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No orders found yet.</div>
              ) : (
                orderHistory.map((order) => (
                  <div key={order.id} className="p-4 border border-border/40 rounded-lg hover:border-orange-500/50 transition space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">ORD-{order.id}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1"><Calendar className="h-3 w-3" />{new Date(order.created_at).toLocaleDateString()}</div>
                      </div>
                      <Badge className={order.status === 'delivered' ? 'bg-green-500/10 text-green-700' : 'bg-blue-500/10 text-blue-700'}>{order.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{order.items.length} items</span>
                      <span className="font-bold text-orange-500">${Number(order.total).toFixed(2)}</span>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex gap-2">
                      <Button size="sm" variant="outline">View Details</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => order.items.forEach((item, index) => addItemToCart({ id: `${order.id}-${index}`, name: item.name, price: Number(item.price) }))}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />Reorder
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="recent" className="space-y-4 mt-6">
              {orderHistory.slice(0, 2).map((order) => (
                <div key={order.id} className="p-4 border border-border/40 rounded-lg space-y-3">
                  <div className="flex items-start justify-between"><div><p className="font-semibold">ORD-{order.id}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p></div><Badge className="bg-blue-500/10 text-blue-700">{order.status}</Badge></div>
                  <div className="flex justify-between text-sm"><span>{order.items.length} items</span><span className="font-bold">${Number(order.total).toFixed(2)}</span></div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 space-y-4"><h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" />Monthly Spending</h3><p className="text-sm text-muted-foreground">Auto-generated from your order totals.</p></Card>
                <Card className="p-4 space-y-4"><h3 className="font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" />Delivered Orders</h3><p className="text-2xl font-bold">{deliveredOrders.length}</p></Card>
              </div>
            </TabsContent>

            <TabsContent value="returns" className="mt-6">
              <div className="text-center py-12 text-muted-foreground space-y-3">
                <p className="text-lg">No returns or exchanges</p>
                <p className="text-sm">All your orders have been completed successfully</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
