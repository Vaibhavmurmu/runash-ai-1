'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, MapPin, Package, Truck, Home } from 'lucide-react';

interface OrderTrackingProps {
  orderId: string;
}

export function OrderTracking({ orderId }: OrderTrackingProps) {
  const trackingEvents = [
    {
      status: 'Ordered',
      timestamp: '2024-01-15 2:30 PM',
      description: 'Your order has been confirmed',
      icon: Package,
      completed: true,
    },
    {
      status: 'Processing',
      timestamp: '2024-01-16 10:15 AM',
      description: 'Your order is being prepared for shipment',
      icon: CheckCircle,
      completed: true,
    },
    {
      status: 'Shipped',
      timestamp: '2024-01-17 3:45 PM',
      description: 'Your package has left our warehouse',
      icon: Truck,
      completed: true,
    },
    {
      status: 'In Transit',
      timestamp: 'Expected 2024-01-20',
      description: 'Your package is on its way',
      icon: MapPin,
      completed: false,
    },
    {
      status: 'Delivered',
      timestamp: 'Expected 2024-01-20',
      description: 'Package will be delivered',
      icon: Home,
      completed: false,
    },
  ];

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Order Tracking</h3>
        <p className="text-sm text-muted-foreground">ID: {orderId}</p>
      </div>

      <div className="space-y-4">
        {trackingEvents.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={event.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`p-2 rounded-full ${event.completed ? 'bg-orange-500' : 'bg-muted'}`}
                >
                  <Icon className={`h-5 w-5 ${event.completed ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                {index < trackingEvents.length - 1 && (
                  <div className={`w-1 h-12 mt-2 ${event.completed ? 'bg-orange-500' : 'bg-muted'}`} />
                )}
              </div>

              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{event.status}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  {event.completed && (
                    <Badge className="bg-green-500/10 text-green-700">Complete</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{event.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
