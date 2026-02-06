'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  TrendingUp,
  ShoppingCart,
  Users,
  Eye,
  Zap,
  Download,
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">Real-time performance metrics</p>
          </div>
          <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: ShoppingCart,
              label: 'Total Orders',
              value: '1,234',
              change: '+12%',
              color: 'from-blue-500/10 to-blue-600/10',
            },
            {
              icon: TrendingUp,
              label: 'Revenue',
              value: '$45,320',
              change: '+8.2%',
              color: 'from-green-500/10 to-green-600/10',
            },
            {
              icon: Users,
              label: 'Active Users',
              value: '8,542',
              change: '+15%',
              color: 'from-orange-500/10 to-orange-600/10',
            },
            {
              icon: Eye,
              label: 'Page Views',
              value: '125.4K',
              change: '+22%',
              color: 'from-purple-500/10 to-purple-600/10',
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Card
                key={metric.label}
                className={`p-4 bg-gradient-to-br ${metric.color} border-border/40`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className="text-xs font-semibold text-green-600">
                      {metric.change} vs last week
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Sales Trend
            </h3>

            <svg viewBox="0 0 400 200" className="w-full h-48">
              <path
                d="M 20 150 L 60 120 L 100 140 L 140 80 L 180 100 L 220 60 L 260 80 L 300 40 L 340 70 L 380 30"
                stroke="#FF6B35"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 20 150 L 60 120 L 100 140 L 140 80 L 180 100 L 220 60 L 260 80 L 300 40 L 340 70 L 380 30 L 400 30 L 400 200 L 20 200 Z"
                fill="#FF6B35"
                opacity="0.1"
              />
            </svg>

            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div>
                <p className="text-muted-foreground">Mon</p>
                <p className="font-semibold">$3.2K</p>
              </div>
              <div>
                <p className="text-muted-foreground">Wed</p>
                <p className="font-semibold">$5.1K</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fri</p>
                <p className="font-semibold">$7.8K</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Top Products
            </h3>

            <div className="space-y-3">
              {[
                { name: 'Wireless Earbuds', sales: 345, revenue: '$45.2K' },
                { name: 'Smart Watch', sales: 289, revenue: '$38.1K' },
                { name: 'Camera Lens Kit', sales: 156, revenue: '$31.2K' },
                { name: 'Portable Speaker', sales: 412, revenue: '$28.5K' },
              ].map((product) => (
                <div key={product.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground">{product.sales} sales</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden mr-3">
                      <div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                        style={{
                          width: `${(product.sales / 450) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-orange-600">
                      {product.revenue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Customer Segments</h3>

oncurrentUserMap            <div className="space-y-3">
              {[
                { segment: 'Premium', percentage: 35, color: 'bg-orange-600' },
                { segment: 'Regular', percentage: 45, color: 'bg-blue-600' },
                { segment: 'New', percentage: 20, color: 'bg-green-600' },
              ].map((seg) => (
                <div key={seg.segment} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{seg.segment}</span>
                    <span className="font-semibold">{seg.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${seg.color}`}
                      style={{ width: `${seg.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Conversion Metrics</h3>

            <div className="space-y-3">
              {[
                { label: 'Click-through Rate', value: '3.2%' },
                { label: 'Add to Cart Rate', value: '8.5%' },
                { label: 'Checkout Completion', value: '72%' },
                { label: 'Order Fulfillment', value: '98.4%' },
              ].map((metric) => (
                <div key={metric.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-semibold text-orange-600">{metric.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Performance Score</h3>

            <div className="relative h-40 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-orange-600">87</div>
                <div className="text-sm text-muted-foreground mt-2">Out of 100</div>
                <Badge className="mt-4 bg-green-500/10 text-green-700">Excellent</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
