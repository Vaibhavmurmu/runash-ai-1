'use client';

import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  Settings,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

  const adminStats = [
    {
      label: 'Total Revenue',
      value: '$156,890',
      change: '+24.5%',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Active Orders',
      value: '842',
      change: '+12.3%',
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Customers',
      value: '12,430',
      change: '+8.2%',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      label: 'Conversion Rate',
      value: '8.2%',
      change: '+1.2%',
      icon: BarChart3,
      color: 'bg-orange-500',
    },
  ];

  const orderMetrics = [
    { status: 'pending', count: 34, value: '$12,450' },
    { status: 'processing', count: 156, value: '$45,230' },
    { status: 'shipped', count: 423, value: '$95,870' },
    { status: 'delivered', count: 8923, value: '$1,234,560' },
    { status: 'cancelled', count: 23, value: '$5,670' },
  ];

  const topProducts = [
    { id: '1', name: 'Premium Silk Blouse', sales: 234, revenue: '$21,106', trend: 'up' },
    { id: '2', name: 'Classic Denim Jacket', sales: 189, revenue: '$24,575', trend: 'up' },
    { id: '3', name: 'Summer Linen Dress', sales: 156, revenue: '$12,478', trend: 'down' },
    { id: '4', name: 'Leather Accessories Pack', sales: 134, revenue: '$6,698', trend: 'up' },
    { id: '5', name: 'Designer Sunglasses', sales: 89, revenue: '$13,361', trend: 'stable' },
  ];

  const recentTransactions = [
    {
      id: '#TXN-28741',
      customer: 'Sarah Chen',
      amount: '$234.50',
      status: 'completed',
      time: '2 min ago',
    },
    {
      id: '#TXN-28740',
      customer: 'Marcus Johnson',
      amount: '$156.75',
      status: 'pending',
      time: '5 min ago',
    },
    {
      id: '#TXN-28739',
      customer: 'Emma Williams',
      amount: '$89.99',
      status: 'completed',
      time: '12 min ago',
    },
    {
      id: '#TXN-28738',
      customer: 'Alex Rodriguez',
      amount: '$423.20',
      status: 'failed',
      time: '18 min ago',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-400">Commerce management and analytics</p>
          </div>
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((range) => (
              <Button
                key={range}
                onClick={() => setDateRange(range)}
                className={`capitalize ${
                  dateRange === range
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {adminStats.map((stat, idx) => {
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Order Status */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Order Status Overview</h2>
            <Card className="bg-slate-900 border-slate-800 p-6">
              <div className="space-y-4">
                {orderMetrics.map((metric) => {
                  const total = orderMetrics.reduce((sum, m) => sum + m.count, 0);
                  const percentage = (metric.count / total) * 100;

                  const statusColor =
                    metric.status === 'delivered'
                      ? 'bg-green-600'
                      : metric.status === 'shipped'
                        ? 'bg-blue-600'
                        : metric.status === 'processing'
                          ? 'bg-orange-600'
                          : metric.status === 'pending'
                            ? 'bg-yellow-600'
                            : 'bg-red-600';

                  return (
                    <div key={metric.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-300 capitalize">
                          {metric.status}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-white">{metric.count}</span>
                          <span className="text-xs text-slate-400 ml-2">{metric.value}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div className={`${statusColor} h-full rounded-full`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white justify-start">
                <Package className="w-4 h-4 mr-2" />
                Manage Inventory
              </Button>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white justify-start">
                <Users className="w-4 h-4 mr-2" />
                View Customers
              </Button>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white justify-start">
                <Filter className="w-4 h-4 mr-2" />
                Filter Orders
              </Button>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Alert Box */}
            <Card className="bg-orange-900/20 border-orange-600 mt-4 p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-300">8 low stock items</p>
                  <p className="text-xs text-orange-200">Action required</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Top Products</h2>
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-slate-300">Product</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-300">Sales</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-300">Revenue</th>
                      <th className="text-center p-4 text-sm font-semibold text-slate-300">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {topProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-800/50">
                        <td className="p-4 text-white font-medium line-clamp-2">{product.name}</td>
                        <td className="p-4 text-right text-white font-semibold">{product.sales}</td>
                        <td className="p-4 text-right text-orange-400 font-bold">{product.revenue}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-sm font-bold ${
                              product.trend === 'up'
                                ? 'text-green-400'
                                : product.trend === 'down'
                                  ? 'text-red-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {product.trend === 'up' ? '↑' : product.trend === 'down' ? '↓' : '→'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Recent Transactions</h2>
            <Card className="bg-slate-900 border-slate-800 divide-y divide-slate-700">
              {recentTransactions.map((transaction) => {
                const statusColor =
                  transaction.status === 'completed'
                    ? 'bg-green-900 text-green-300'
                    : transaction.status === 'pending'
                      ? 'bg-orange-900 text-orange-300'
                      : 'bg-red-900 text-red-300';

                return (
                  <div key={transaction.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">{transaction.id}</p>
                        <p className="text-sm text-slate-400">{transaction.customer}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${statusColor}`}>
                        {transaction.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-400 font-semibold">{transaction.amount}</span>
                      <span className="text-xs text-slate-500">{transaction.time}</span>
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
