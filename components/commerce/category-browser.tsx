'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Shirt,
  Watch,
  Glasses,
  Zap,
  Home,
} from 'lucide-react';

export function CategoryBrowser() {
  const categories = [
    { icon: ShoppingBag, label: 'All Products', count: 2451 },
    { icon: Shirt, label: 'Clothing', count: 685 },
    { icon: Watch, label: 'Accessories', count: 432 },
    { icon: Glasses, label: 'Eyewear', count: 156 },
    { icon: Zap, label: 'Electronics', count: 892 },
    { icon: Home, label: 'Home & Garden', count: 1245 },
  ];

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-semibold text-lg">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.label}
              variant="ghost"
              className="w-full justify-start text-left hover:bg-orange-500/10"
            >
              <Icon className="h-4 w-4 mr-3 text-orange-500" />
              <span className="flex-1">{category.label}</span>
              <span className="text-xs text-muted-foreground">{category.count}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
