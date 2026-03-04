'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, AlertCircle } from 'lucide-react';

export function FulfillmentStatus() {
  const fulfillmentStages = [
    {
      stage: 'Order Received',
      percentage: 100,
      icon: CheckCircle,
      status: 'Complete',
      timestamp: '2024-01-15 10:30 AM',
    },
    {
      stage: 'Pick & Pack',
      percentage: 100,
      icon: Package,
      status: 'Complete',
      timestamp: '2024-01-16 2:15 PM',
    },
    {
      stage: 'QC Check',
      percentage: 75,
      icon: CheckCircle,
      status: 'In Progress',
      timestamp: 'Started 2024-01-17 9:00 AM',
    },
    {
      stage: 'Shipped',
      percentage: 0,
      icon: AlertCircle,
      status: 'Pending',
      timestamp: 'Expected 2024-01-18',
    },
  ];

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold mb-1">Fulfillment Pipeline</h3>
        <p className="text-xs text-muted-foreground">Overall Progress: 43.75%</p>
      </div>

      <div className="space-y-4">
        {fulfillmentStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">{stage.stage}</span>
                </div>
                <Badge
                  variant={stage.status === 'Complete' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {stage.status}
                </Badge>
              </div>
              <Progress value={stage.percentage} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{stage.timestamp}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 pt-4 border-t border-border/40">
        <h4 className="text-sm font-semibold">Warehouse Info</h4>
        <div className="text-xs space-y-1 text-muted-foreground">
          <p>Facility: West Coast Distribution Center</p>
          <p>Location: Los Angeles, CA</p>
          <p>Capacity: 87%</p>
        </div>
      </div>
    </Card>
  );
}
