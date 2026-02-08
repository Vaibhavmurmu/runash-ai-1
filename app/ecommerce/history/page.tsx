'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';

export default function HistoryPage() {
  const orderHistory = [
    {
      id: 'ORD-001234',
      date: '2024-01-15',
      items: 3,
      total: '$249.99',
      status: 'Delivered',
      deliveredDate: '2024-01-20',
    },
    {
      id: 'ORD-001235',
      date: '2024-01-14',
      items: 2,
      total: '$189.50',
      status: 'In Transit',
      estimatedDelivery: '2024-01-22',
    },
    {
      id: 'ORD-001233',
      date: '2024-01-10',
      items: 1,
      total: '$89.99',
      status: 'Delivered',
      deliveredDate: '2024-01-15',
    },
    {
      id: 'ORD-001232',
      date: '2024-01-08',
      items: 4,
      total: '$599.99',
      status: 'Delivered',
      deliveredDate: '2024-01-12',
    },
    {
      id: 'ORD-001231',
      date: '2024-01-05',
      items: 2,
      total: '$349.99',
      status: 'Delivered',
      deliveredDate: '2024-01-10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-muted-foreground mt-2">View all your past and current orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Orders', value: '24', icon: '📦' },
            { label: 'Total Spent', value: '$2,450', icon: '💰' },
            { label: 'Avg. Order Value', value: '$102.08', icon: '📊' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 space-y-2">
              <p className="text-3xl">{stat.icon}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {orderHistory.map((order) => (
                <div
                  key={order.id}
                  className="p-4 border border-border/40 rounded-lg hover:border-orange-500/50 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.id}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {order.date}
                      </div>
                    </div>
                    <Badge
                      className={
                        order.status === 'Delivered'
                          ? 'bg-green-500/10 text-green-700'
                          : 'bg-blue-500/10 text-blue-700'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{order.items} items</span>
                    <span className="font-bold text-orange-500">{order.total}</span>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex gap-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      Reorder
                    </Button>
                    <Button size="sm" variant="outline">
                      Track
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="recent" className="space-y-4 mt-6">
              {orderHistory.slice(0, 2).map((order) => (
                <div
                  key={order.id}
                  className="p-4 border border-border/40 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.date}</p>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-700">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{order.items} items</span>
                    <span className="font-bold">{order.total}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Monthly Spending
                  </h3>
                  <div className="space-y-2">
                    {[
                      { month: 'January', amount: '$450' },
                      { month: 'December', amount: '$320' },
                      { month: 'November', amount: '$580' },
                    ].map((item) => (
                      <div key={item.month} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.month}</span>
                        <span className="font-medium">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Top Categories
                  </h3>
                  <div className="space-y-2">
                    {[
                      { category: 'Electronics', percentage: 45 },
                      { category: 'Fashion', percentage: 30 },
                      { category: 'Home', percentage: 25 },
                    ].map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.category}</span>
                          <span className="font-medium">{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-orange-600 h-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="returns" className="mt-6">
              <div className="text-center py-12 text-muted-foreground space-y-3">
                <p className="text-lg">No returns or exchanges</p>
                <p className="text-sm">All your orders have been completed successfully</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
