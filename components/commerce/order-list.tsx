'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, MapPin, Truck } from 'lucide-react';

interface OrderListProps {
  status: 'active' | 'processing' | 'delivered';
  onSelectOrder: (orderId: string) => void;
}

export function OrderList({ status, onSelectOrder }: OrderListProps) {
  const orders = [
    {
      id: 'ORD-001234',
      date: '2024-01-15',
      total: '$249.99',
      items: 3,
      status: 'active',
      estimatedDelivery: '2024-01-20',
      location: 'In Transit',
    },
    {
      id: 'ORD-001235',
      date: '2024-01-14',
      total: '$189.50',
      items: 2,
      status: 'processing',
      estimatedDelivery: '2024-01-22',
      location: 'Processing',
    },
    {
      id: 'ORD-001233',
      date: '2024-01-10',
      total: '$89.99',
      items: 1,
      status: 'delivered',
      estimatedDelivery: '2024-01-15',
      location: 'Delivered',
    },
  ].filter((order) => order.status === status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500/10 text-blue-700';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'delivered':
        return 'bg-green-500/10 text-green-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <div className="space-y-3">
      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No {status} orders found
        </div>
      ) : (
        orders.map((order) => (
          <Card
            key={order.id}
            className="p-4 cursor-pointer hover:border-orange-500/50 hover:shadow-md transition"
            onClick={() => onSelectOrder(order.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{order.id}</p>
                    <p className="text-sm text-muted-foreground">Order placed {order.date}</p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {order.location}
                  </div>
                  <div>Est. Delivery: {order.estimatedDelivery}</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-sm">{order.items} items</span>
                  <span className="font-semibold">{order.total}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground ml-4 flex-shrink-0 mt-1" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
