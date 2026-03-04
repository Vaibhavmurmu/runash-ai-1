'use client';

import { useMemo } from 'react';
import { Activity, BarChart3, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrderHistoryData } from '@/hooks/use-commerce-data';

export default function EcommerceAnalyticsPage() {
  const { data: orders, loading, error } = useOrderHistoryData();

  const metrics = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const itemsSold = orders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
      0,
    );
    const averageOrderValue = orders.length ? revenue / orders.length : 0;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const deliveryRate = orders.length ? (delivered / orders.length) * 100 : 0;

    return { revenue, itemsSold, averageOrderValue, delivered, deliveryRate };
  }, [orders]);

  if (loading) return <div className="container mx-auto px-4 py-8">Loading analytics...</div>;
  if (error) return <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold">Commerce Analytics</h1>
          <p className="mt-2 text-muted-foreground">Real-time summary built from order history data.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="space-y-2 p-5">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold">${metrics.revenue.toFixed(2)}</p>
          </Card>
          <Card className="space-y-2 p-5">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </Card>
          <Card className="space-y-2 p-5">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-muted-foreground">Avg Order Value</p>
            <p className="text-2xl font-bold">${metrics.averageOrderValue.toFixed(2)}</p>
          </Card>
          <Card className="space-y-2 p-5">
            <Users className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-muted-foreground">Items Sold</p>
            <p className="text-2xl font-bold">{metrics.itemsSold}</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4 text-orange-600" /> Delivery performance
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivered Orders</span>
                <span className="font-semibold">{metrics.delivered}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600" style={{ width: `${metrics.deliveryRate}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{metrics.deliveryRate.toFixed(1)}% completion rate</p>
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Activity className="h-4 w-4 text-orange-600" /> Order Status Breakdown
            </h2>
            <div className="space-y-2">
              {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
                const count = orders.filter((order) => order.status === status).length;
                return (
                  <div key={status} className="flex items-center justify-between rounded-md border p-2">
                    <span className="capitalize text-sm">{status}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
