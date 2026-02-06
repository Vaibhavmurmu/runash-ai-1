'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  Package,
  ShoppingCart,
  Zap,
  AlertCircle,
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'delivery',
      title: 'Order Delivered',
      message: 'Your order ORD-001234 has been delivered',
      timestamp: '5 minutes ago',
      read: false,
      icon: Package,
    },
    {
      id: 2,
      type: 'promo',
      title: 'Flash Sale Alert',
      message: '20% off on Wireless Earbuds - Limited time offer',
      timestamp: '2 hours ago',
      read: false,
      icon: Zap,
    },
    {
      id: 3,
      type: 'order',
      title: 'Order Shipped',
      message: 'Your order ORD-001235 is on its way',
      timestamp: '1 day ago',
      read: true,
      icon: ShoppingCart,
    },
    {
      id: 4,
      type: 'alert',
      title: 'Account Alert',
      message: 'New login from a different device detected',
      timestamp: '3 days ago',
      read: true,
      icon: AlertCircle,
    },
  ]);

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter((notif) => notif.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-2">
              {unreadCount} unread notifications
            </p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Preferences
          </Button>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-orange-600">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-6">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-lg border transition ${
                        notif.read
                          ? 'border-border/40 bg-background'
                          : 'border-orange-500/50 bg-orange-500/5'
                      } hover:border-orange-500/50`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            notif.read
                              ? 'bg-muted'
                              : 'bg-orange-500/20'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              notif.read
                                ? 'text-muted-foreground'
                                : 'text-orange-600'
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{notif.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {notif.message}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="h-2 w-2 rounded-full bg-orange-600 flex-shrink-0 mt-2" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {notif.timestamp}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {!notif.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notif.id)}
                              className="text-xs"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notif.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-3 mt-6">
              {notifications.filter((n) => !n.read).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>All caught up!</p>
                </div>
              ) : (
                notifications
                  .filter((n) => !n.read)
                  .map((notif) => {
                    const Icon = notif.icon;
                    return (
                      <div
                        key={notif.id}
                        className="p-4 rounded-lg border border-orange-500/50 bg-orange-500/5 space-y-2"
                      >
                        <div className="flex items-start gap-4">
                          <Icon className="h-5 w-5 text-orange-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold">{notif.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notif.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {notif.timestamp}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notif.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-3 mt-6">
              {notifications
                .filter((n) => n.type === 'order' || n.type === 'delivery')
                .map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className="p-4 rounded-lg border border-border/40 space-y-2"
                    >
                      <div className="flex items-start gap-4">
                        <Icon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold">{notif.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </TabsContent>

            <TabsContent value="promotions" className="space-y-3 mt-6">
              {notifications
                .filter((n) => n.type === 'promo')
                .map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className="p-4 rounded-lg border border-border/40 space-y-2"
                    >
                      <div className="flex items-start gap-4">
                        <Icon className="h-5 w-5 text-orange-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold">{notif.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {notif.message}
                          </p>
                          <Button size="sm" className="mt-2 bg-orange-600 hover:bg-orange-700">
                            Shop Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="p-6 mt-8">
          <h3 className="font-semibold text-lg mb-4">Notification Preferences</h3>

          <div className="space-y-4">
            {[
              { label: 'Order Updates', description: 'Shipment and delivery notifications' },
              {
                label: 'Promotional Offers',
                description: 'Sales, discounts, and special offers',
              },
              {
                label: 'Wishlist Alerts',
                description: 'Price drops on items in your wishlist',
              },
              {
                label: 'Account Alerts',
                description: 'Login activity and security notifications',
              },
            ].map((pref) => (
              <div
                key={pref.label}
                className="flex items-center justify-between p-3 border border-border/40 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
