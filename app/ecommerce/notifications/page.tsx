'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, Settings, Package, ShoppingCart, Zap, AlertCircle } from 'lucide-react';
import { useNotificationsData } from '@/hooks/use-commerce-data';

const iconMap = {
  delivery: Package,
  promo: Zap,
  order: ShoppingCart,
  alert: AlertCircle,
} as const;

export default function NotificationsPage() {
  const { data: notifications, loading, error, markAsRead, removeNotification } = useNotificationsData();
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) return <div className="container mx-auto px-4 py-8">Loading notifications...</div>;
  if (error) return <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-2">{unreadCount} unread notifications</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent"><Settings className="h-4 w-4" />Preferences</Button>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread{unreadCount > 0 && <Badge className="ml-2 bg-orange-600">{unreadCount}</Badge>}</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-6">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Bell className="mx-auto h-8 w-8 mb-2" /><p className="text-lg">No notifications</p></div>
              ) : (
                notifications.map((notif) => {
                  const Icon = iconMap[notif.type];
                  return (
                    <div key={notif.id} className={`p-4 rounded-lg border transition ${notif.read ? 'border-border/40 bg-background' : 'border-orange-500/50 bg-orange-500/5'} hover:border-orange-500/50`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${notif.read ? 'bg-muted' : 'bg-orange-500/20'}`}><Icon className={`h-5 w-5 ${notif.read ? 'text-muted-foreground' : 'text-orange-600'}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{notif.title}</p><p className="text-sm text-muted-foreground">{notif.message}</p></div>{!notif.read && <div className="h-2 w-2 rounded-full bg-orange-600 flex-shrink-0 mt-2" />}</div>
                          <p className="text-xs text-muted-foreground mt-2">{notif.timestamp}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {!notif.read && <Button size="sm" variant="ghost" onClick={() => markAsRead(notif.id)} className="text-xs"><Check className="h-4 w-4" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => removeNotification(notif.id)} className="text-xs text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-3 mt-6">
              {notifications.filter((n) => !n.read).length === 0 ? <div className="text-center py-12 text-muted-foreground"><p>All caught up!</p></div> : notifications.filter((n) => !n.read).map((notif) => {
                const Icon = iconMap[notif.type];
                return (
                  <div key={notif.id} className="p-4 rounded-lg border border-orange-500/50 bg-orange-500/5 space-y-2">
                    <div className="flex items-start gap-4"><Icon className="h-5 w-5 text-orange-600 flex-shrink-0" /><div className="flex-1"><p className="font-semibold">{notif.title}</p><p className="text-sm text-muted-foreground">{notif.message}</p><p className="text-xs text-muted-foreground mt-2">{notif.timestamp}</p></div><Button size="sm" variant="ghost" onClick={() => removeNotification(notif.id)}><Trash2 className="h-4 w-4" /></Button></div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="orders" className="space-y-3 mt-6">
              {notifications.filter((n) => n.type === 'order' || n.type === 'delivery').map((notif) => {
                const Icon = iconMap[notif.type];
                return <div key={notif.id} className="p-4 rounded-lg border border-border/40 space-y-2"><div className="flex items-start gap-4"><Icon className="h-5 w-5 text-blue-600 flex-shrink-0" /><div className="flex-1"><p className="font-semibold">{notif.title}</p><p className="text-sm text-muted-foreground">{notif.message}</p></div></div></div>;
              })}
            </TabsContent>

            <TabsContent value="promotions" className="space-y-3 mt-6">
              {notifications.filter((n) => n.type === 'promo').map((notif) => {
                const Icon = iconMap[notif.type];
                return <div key={notif.id} className="p-4 rounded-lg border border-border/40 space-y-2"><div className="flex items-start gap-4"><Icon className="h-5 w-5 text-orange-600 flex-shrink-0" /><div className="flex-1"><p className="font-semibold">{notif.title}</p><p className="text-sm text-muted-foreground">{notif.message}</p><Button size="sm" className="mt-2 bg-orange-600 hover:bg-orange-700">Shop Now</Button></div></div></div>;
              })}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
