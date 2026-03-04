'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { TrendingUp, Package, Users, Zap, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LiveUpdate {
  id: string;
  type: 'order' | 'user' | 'inventory' | 'revenue' | 'livestream';
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  timestamp: string;
}

export default function LiveUpdateFeed() {
  const [updates, setUpdates] = useState<LiveUpdate[]>([
    {
      id: '1',
      type: 'order',
      title: 'Order Completed',
      value: '#ORD-28741',
      change: '+$234.50',
      icon: <ShoppingCart className="w-4 h-4" />,
      timestamp: 'now',
    },
    {
      id: '2',
      type: 'revenue',
      title: 'Revenue Update',
      value: 'Today: $12,456',
      change: '+8.2%',
      icon: <TrendingUp className="w-4 h-4" />,
      timestamp: '1 min ago',
    },
    {
      id: '3',
      type: 'user',
      title: 'New Customer',
      value: 'Sarah Chen',
      change: 'First Purchase',
      icon: <Users className="w-4 h-4" />,
      timestamp: '2 min ago',
    },
    {
      id: '4',
      type: 'inventory',
      title: 'Stock Alert',
      value: 'Denim Jacket',
      change: '15 units left',
      icon: <Package className="w-4 h-4" />,
      timestamp: '3 min ago',
    },
    {
      id: '5',
      type: 'livestream',
      title: 'Live Viewers',
      value: '5,243 watching',
      change: '+12 in 1m',
      icon: <Zap className="w-4 h-4" />,
      timestamp: 'now',
    },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newUpdate: LiveUpdate = {
        id: `update-${Date.now()}`,
        type: 'revenue',
        title: 'Live Revenue',
        value: `$${Math.floor(Math.random() * 500) + 100}`,
        change: `+${Math.floor(Math.random() * 5) + 1} orders`,
        icon: <TrendingUp className="w-4 h-4" />,
        timestamp: 'now',
      };
      setUpdates((prev) => [newUpdate, ...prev.slice(0, 8)]);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'text-blue-400 bg-blue-900/20';
      case 'revenue':
        return 'text-green-400 bg-green-900/20';
      case 'user':
        return 'text-purple-400 bg-purple-900/20';
      case 'inventory':
        return 'text-orange-400 bg-orange-900/20';
      case 'livestream':
        return 'text-pink-400 bg-pink-900/20';
      default:
        return 'text-slate-400 bg-slate-800/20';
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Live Update Feed
        </h3>
      </div>

      <div className="space-y-0 max-h-96 overflow-y-auto">
        {updates.map((update) => (
          <div
            key={update.id}
            className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-lg ${getTypeColor(update.type)}`}>
                {update.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{update.title}</p>
                <p className="text-xs text-slate-400 mt-1">{update.value}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-bold ${getTypeColor(update.type)}`}>
                    {update.change}
                  </span>
                  <span className="text-xs text-slate-500">{update.timestamp}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 px-6 py-3 border-t border-slate-700 text-center">
        <a href="#" className="text-sm text-orange-400 hover:text-orange-300 font-medium">
          View All Updates →
        </a>
      </div>
    </Card>
  );
}
