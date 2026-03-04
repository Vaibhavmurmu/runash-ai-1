'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Bell, CreditCard, Heart, History, ShoppingCart, Store } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { useNotificationsData, useOrderHistoryData, useWishlistData } from '@/hooks/use-commerce-data';

export default function EcommerceOverviewPage() {
  const { state } = useCart();
  const { data: wishlistItems, loading: wishlistLoading } = useWishlistData();
  const { data: orders, loading: ordersLoading } = useOrderHistoryData();
  const { data: notifications, loading: notificationsLoading } = useNotificationsData();

  const unreadCount = notifications.filter((item) => !item.read).length;

  const shortcuts = [
    { href: '/ecommerce/cart', label: 'Cart', icon: ShoppingCart, value: state.cart.items.length, loading: false },
    { href: '/ecommerce/wishlist', label: 'Wishlist', icon: Heart, value: wishlistItems.length, loading: wishlistLoading },
    { href: '/ecommerce/history', label: 'Orders', icon: History, value: orders.length, loading: ordersLoading },
    { href: '/ecommerce/notifications', label: 'Notifications', icon: Bell, value: unreadCount, loading: notificationsLoading },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <div className="space-y-3">
          <Badge className="bg-orange-500/10 text-orange-600">Commerce Workspace</Badge>
          <h1 className="text-3xl font-bold">Commerce Control Center</h1>
          <p className="text-muted-foreground">
            Manage all commerce pages from one place, keep data synced, and quickly move between cart, payments,
            analytics, and customer experience flows.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Card key={shortcut.href} className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="rounded-md bg-orange-500/10 p-2 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-2xl font-bold">{shortcut.loading ? '...' : shortcut.value}</span>
                </div>
                <p className="font-semibold">{shortcut.label}</p>
                <Button asChild variant="outline" className="w-full justify-between bg-transparent">
                  <Link href={shortcut.href}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="space-y-4 p-6">
          <h2 className="text-xl font-semibold">Integrated Commerce Pages</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/grocery', label: 'Storefront', icon: Store },
              { href: '/ecommerce/payments', label: 'Payments', icon: CreditCard },
              { href: '/ecommerce/analytics', label: 'Analytics', icon: ArrowRight },
              { href: '/ecommerce/integration-hub', label: 'Integration Hub', icon: ArrowRight },
              { href: '/ecommerce/profile', label: 'Customer Profile', icon: ArrowRight },
              { href: '/grocery/live', label: 'Live Shopping', icon: ArrowRight },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Button key={item.href} asChild variant="secondary" className="justify-between">
                  <Link href={item.href}>
                    {item.label}
                    <Icon className="h-4 w-4" />
                  </Link>
                </Button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
