'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Phone } from 'lucide-react';

export function ShippingTracker() {
  const shipments = [
    {
      id: 'SHP-2024-001',
      carrier: 'FastShip Express',
      origin: 'Los Angeles, CA',
      destination: 'New York, NY',
      status: 'In Transit',
      currentLocation: 'Chicago, IL',
      progress: 65,
      estimatedDelivery: '2024-01-20',
      packages: 45,
    },
    {
      id: 'SHP-2024-002',
      carrier: 'Global Logistics',
      origin: 'San Francisco, CA',
      destination: 'Miami, FL',
      status: 'Processing',
      currentLocation: 'San Francisco Distribution Center',
      progress: 20,
      estimatedDelivery: '2024-01-22',
      packages: 128,
    },
    {
      id: 'SHP-2024-003',
      carrier: 'QuickDeliver',
      origin: 'Seattle, WA',
      destination: 'Boston, MA',
      status: 'Out for Delivery',
      currentLocation: 'Boston, MA',
      progress: 95,
      estimatedDelivery: '2024-01-19',
      packages: 67,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit':
        return 'bg-blue-500/10 text-blue-700';
      case 'Processing':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'Out for Delivery':
        return 'bg-green-500/10 text-green-700';
      case 'Delivered':
        return 'bg-green-500/10 text-green-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {shipments.map((shipment) => (
        <Card key={shipment.id} className="p-4 border-border/40">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{shipment.id}</p>
                <p className="text-sm text-muted-foreground">{shipment.carrier}</p>
              </div>
              <Badge className={getStatusColor(shipment.status)}>
                {shipment.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">From</p>
                <p className="font-medium">{shipment.origin}</p>
              </div>
              <div>
                <p className="text-muted-foreground">To</p>
                <p className="font-medium">{shipment.destination}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Location: {shipment.currentLocation}</span>
                <span>{shipment.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-full transition-all duration-300"
                  style={{ width: `${shipment.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="text-muted-foreground">Est. Delivery</p>
                <p className="font-medium">{shipment.estimatedDelivery}</p>
                <p className="text-xs text-muted-foreground mt-1">{shipment.packages} packages</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                  <Phone className="h-4 w-4" />
                  Support
                </Button>
                <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700">
                  <ExternalLink className="h-4 w-4" />
                  Track
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
