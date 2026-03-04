'use client';

import { Card } from '@/components/ui/card';
import { Truck, Package, Clock, Zap } from 'lucide-react';

export function LogisticsMetrics() {
  const metrics = [
    {
      icon: Truck,
      label: 'Active Shipments',
      value: '247',
      change: '+12%',
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      icon: Package,
      label: 'Packages In Transit',
      value: '1,234',
      change: '+8%',
      color: 'from-orange-500/10 to-orange-600/10',
    },
    {
      icon: Clock,
      label: 'Avg. Delivery Time',
      value: '2.3 days',
      change: '-5%',
      color: 'from-green-500/10 to-green-600/10',
    },
    {
      icon: Zap,
      label: 'On-Time Rate',
      value: '98.4%',
      change: '+2%',
      color: 'from-purple-500/10 to-purple-600/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.label} className={`p-4 bg-gradient-to-br ${metric.color} border-border/40`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs font-semibold text-green-600">{metric.change} from last week</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
