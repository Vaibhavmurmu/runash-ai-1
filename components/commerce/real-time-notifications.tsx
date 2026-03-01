'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { X, Bell, Package, Zap, Heart, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'order' | 'inventory' | 'promotion' | 'system' | 'livestream';
  title: string;
  message: string;
  icon: React.ReactNode;
  timestamp: string;
  status: 'new' | 'read';
  actionUrl?: string;
}

export default function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'order',
      title: 'Order Shipped',
      message: 'Your order #ORD-28741 has been shipped and is on the way!',
      icon: <Package className="w-5 h-5" />,
      timestamp: 'now',
      status: 'new',
    },
    {
      id: '2',
      type: 'livestream',
      title: 'Live Stream Starting',
      message: 'Summer Collection Launch going live in 5 minutes!',
      icon: <Zap className="w-5 h-5" />,
      timestamp: '2 min ago',
      status: 'new',
    },
    {
      id: '3',
      type: 'inventory',
      title: 'Back in Stock',
      message: 'Premium Silk Blouse (Cream) is back in stock',
      icon: <CheckCircle className="w-5 h-5" />,
      timestamp: '5 min ago',
      status: 'new',
    },
    {
      id: '4',
      type: 'promotion',
      title: 'Exclusive Offer',
      message: 'Get 20% off your next purchase with code SUMMER20',
      icon: <Heart className="w-5 h-5" />,
      timestamp: '12 min ago',
      status: 'read',
    },
    {
      id: '5',
      type: 'system',
      title: 'Payment Received',
      message: 'Payment of $234.50 received for order #ORD-28740',
      icon: <CheckCircle className="w-5 h-5" />,
      timestamp: '18 min ago',
      status: 'read',
    },
  ]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'livestream'>('all');

  const unreadCount = notifications.filter((n) => n.status === 'new').length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'text-blue-400 bg-blue-900/30';
      case 'inventory':
        return 'text-green-400 bg-green-900/30';
      case 'promotion':
        return 'text-pink-400 bg-pink-900/30';
      case 'livestream':
        return 'text-orange-400 bg-orange-900/30';
      case 'system':
        return 'text-slate-400 bg-slate-800';
      default:
        return 'text-slate-400 bg-slate-800';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'orders') return ['order', 'system', 'inventory'].includes(n.type);
    if (activeTab === 'livestream') return n.type === 'livestream';
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, status: 'read' } : n))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Simulate new notification
  useEffect(() => {
    const timer = setInterval(() => {
      if (notifications.length < 10) {
        const newNotification: Notification = {
          id: `new-${Date.now()}`,
          type: 'system',
          title: 'Real-Time Update',
          message: `Live inventory update at ${new Date().toLocaleTimeString()}`,
          icon: <Loader className="w-5 h-5 animate-spin" />,
          timestamp: 'now',
          status: 'new',
        };
        setNotifications((prev) => [newNotification, ...prev]);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(timer);
  }, [notifications.length]);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed right-4 top-16 w-96 max-h-[600px] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-lg">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-4 border-b border-slate-800">
            {(['all', 'orders', 'livestream'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded capitalize text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                      notification.status === 'new' ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 p-2 rounded ${getTypeColor(notification.type)}`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-semibold text-white">{notification.title}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="p-1 hover:bg-slate-700 rounded transition-colors ml-2"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500">{notification.timestamp}</span>
                          {notification.status === 'new' && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="border-t border-slate-800 p-3 flex gap-2">
              <Button
                onClick={clearAll}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm h-8"
              >
                Clear All
              </Button>
              <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm h-8">
                View All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
