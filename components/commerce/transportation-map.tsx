'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';

export function TransportationMap() {
  return (
    <div className="space-y-4">
      <div className="relative h-96 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center space-y-4">
          <Navigation className="h-16 w-16 text-orange-500 mx-auto opacity-50" />
          <div>
            <p className="text-lg font-semibold text-white">Live Route Visualization</p>
            <p className="text-sm text-muted-foreground">Real-time transportation tracking map</p>
          </div>
          <svg viewBox="0 0 400 200" className="w-full h-auto max-w-md mx-auto">
            <path
              d="M 50 100 Q 150 50 300 100"
              stroke="#FF6B35"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
            <circle cx="50" cy="100" r="8" fill="#004E89" />
            <circle cx="300" cy="100" r="8" fill="#004E89" />
            <circle cx="150" cy="70" r="6" fill="#FF6B35" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Los Angeles', status: 'Departed' },
          { label: 'Chicago', status: 'Current' },
          { label: 'New York', status: 'Arriving' },
        ].map((location) => (
          <Card key={location.label} className="p-3 text-center space-y-2">
            <Badge className="mx-auto" variant={location.status === 'Current' ? 'default' : 'secondary'}>
              {location.status}
            </Badge>
            <p className="font-medium text-sm">{location.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
