'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, MessageSquare, RotateCcw } from 'lucide-react';

interface OrderConfirmationProps {
  orderId: string;
}

export function OrderConfirmation({ orderId }: OrderConfirmationProps) {
  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Order Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">$199.99</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">$10.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">$16.79</span>
          </div>
          <div className="border-t border-border/40 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-orange-500">$226.78</span>
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-xs font-semibold text-muted-foreground">SHIPPING ADDRESS</p>
          <div className="text-sm">
            <p className="font-medium">John Doe</p>
            <p className="text-muted-foreground">123 Main Street</p>
            <p className="text-muted-foreground">San Francisco, CA 94105</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <Button className="w-full gap-2 bg-orange-600 hover:bg-orange-700">
          <Download className="h-4 w-4" />
          Download Invoice
        </Button>
        <Button variant="outline" className="w-full gap-2 bg-transparent">
          <MessageSquare className="h-4 w-4" />
          Contact Support
        </Button>
        <Button variant="outline" className="w-full gap-2 bg-transparent">
          <RotateCcw className="h-4 w-4" />
          Return Items
        </Button>
      </Card>
    </div>
  );
}
