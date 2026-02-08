'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, Zap, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reserved: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
  reorderLevel: number;
}

export default function ShoppingDashboardPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Premium Silk Blouse',
      sku: 'PSB-001',
      price: 89.99,
      stock: 42,
      reserved: 8,
      lastUpdated: 'now',
      trend: 'down',
      reorderLevel: 20,
    },
    {
      id: '2',
      name: 'Classic Denim Jacket',
      sku: 'CDJ-002',
      price: 129.99,
      stock: 15,
      reserved: 5,
      lastUpdated: '2 min ago',
      trend: 'up',
      reorderLevel: 25,
    },
    {
      id: '3',
      name: 'Summer Linen Dress',
      sku: 'SLD-003',
      price: 79.99,
      stock: 3,
      reserved: 12,
      lastUpdated: 'now',
      trend: 'down',
      reorderLevel: 15,
    },
    {
      id: '4',
      name: 'Leather Accessories Pack',
      sku: 'LAP-004',
      price: 49.99,
      stock: 67,
      reserved: 2,
      lastUpdated: '5 min ago',
      trend: 'stable',
      reorderLevel: 10,
    },
  ]);

  const [recentOrders, setRecentOrders] = useState([
    { id: '#ORD-28741', customer: 'Sarah Chen', total: '$234.50', status: 'shipped', time: '2 min ago' },
    { id: '#ORD-28740', customer: 'Marcus Johnson', total: '$156.75', status: 'processing', time: '5 min ago' },
    { id: '#ORD-28739', customer: 'Emma Williams', total: '$89.99', status: 'delivered', time: '12 min ago' },
    { id: '#ORD-28738', customer: 'Alex Rodriguez', total: '$423.20', status: 'pending', time: '18 min ago' },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'clothing', 'accessories', 'electronics', 'home'];

  const stats = [
    {
      label: 'Total Stock Value',
      value: '$24,580.50',
      change: '+2.3%',
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: 'Orders Today',
      value: '127',
      change: '+12.5%',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Low Stock Items',
      value: '3',
      change: '-1',
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      label: 'Reserved Items',
      value: '27',
      change: '+5.2%',
      icon: Zap,
      color: 'bg-purple-500',
    },
  ];

  const lowStockItems = inventory.filter((item) => item.stock <= item.reorderLevel);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Real-Time Shopping Dashboard</h1>
          <p className="text-slate-400">Live inventory tracking and order management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-400">{stat.change}</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <Card className="bg-orange-900/20 border-orange-600 p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-300 mb-1">Low Stock Alert</h3>
                <p className="text-sm text-orange-200">
                  {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} below reorder level.
                  Consider restocking soon.
                </p>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white text-sm h-8">
                Reorder
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inventory */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Live Inventory</h2>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white text-sm">
                Sync Now
              </Button>
            </div>

            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Product</th>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">SKU</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-300">Stock</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-300">Reserved</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-300">Available</th>
                      <th className="text-center p-4 text-sm font-semibold text-slate-300">Status</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-300">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {inventory.map((item) => {
                      const available = item.stock - item.reserved;
                      const statusColor =
                        available === 0
                          ? 'text-red-400'
                          : available <= item.reorderLevel
                            ? 'text-orange-400'
                            : 'text-green-400';
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 text-white font-medium">{item.name}</td>
                          <td className="p-4 text-slate-400 text-sm">{item.sku}</td>
                          <td className="p-4 text-right text-white font-semibold">{item.stock}</td>
                          <td className="p-4 text-right text-slate-400">{item.reserved}</td>
                          <td className={`p-4 text-right font-bold ${statusColor}`}>{available}</td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                available === 0
                                  ? 'bg-red-600 text-white'
                                  : available <= item.reorderLevel
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-green-900 text-green-300'
                              }`}
                            >
                              {available === 0 ? 'Out' : available <= item.reorderLevel ? 'Low' : 'Good'}
                            </span>
                          </td>
                          <td className="p-4 text-right text-slate-400 text-sm">{item.lastUpdated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Orders */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Orders</h2>
            <Card className="bg-slate-900 border-slate-800 divide-y divide-slate-700">
              {recentOrders.map((order) => {
                const statusColor =
                  order.status === 'delivered'
                    ? 'bg-green-900 text-green-300'
                    : order.status === 'shipped'
                      ? 'bg-blue-900 text-blue-300'
                      : order.status === 'processing'
                        ? 'bg-orange-900 text-orange-300'
                        : 'bg-slate-800 text-slate-300';

                return (
                  <div key={order.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-white">{order.id}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold capitalize ${statusColor}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{order.customer}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-400 font-semibold">{order.total}</span>
                      <span className="text-xs text-slate-500">{order.time}</span>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
