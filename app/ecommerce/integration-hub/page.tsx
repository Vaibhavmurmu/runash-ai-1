'use client';

import Link from 'next/link';
import { Activity, ArrowRight, Bell, CheckCircle2, CreditCard, Package, ShoppingCart, Workflow } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/cart-context';
import { useNotificationsData, useOrderHistoryData, useWishlistData } from '@/hooks/use-commerce-data';

export default function IntegrationHubPage() {
  const { state } = useCart();
  const { data: wishlistItems, loading: wishlistLoading } = useWishlistData();
  const { data: orders, loading: ordersLoading } = useOrderHistoryData();
  const { data: notifications, loading: notificationLoading } = useNotificationsData();

  const integrations = [
    {
      title: 'Cart Sync',
      description: 'Shared cart state between grocery, chat and checkout pages.',
      icon: ShoppingCart,
      value: `${state.cart.items.length} items`,
      status: 'active',
      href: '/ecommerce/cart',
    },
    {
      title: 'Wishlist Service',
      description: 'Server-backed wishlist endpoints with live removal actions.',
      icon: Package,
      value: wishlistLoading ? 'Syncing…' : `${wishlistItems.length} saved`,
      status: 'active',
      href: '/ecommerce/wishlist',
    },
    {
      title: 'Order History',
      description: 'Order APIs connected with reorder actions.',
      icon: CreditCard,
      value: ordersLoading ? 'Syncing…' : `${orders.length} orders`,
      status: 'active',
      href: '/ecommerce/history',
    },
    {
      title: 'Notification Center',
      description: 'Read/delete actions backed by notification routes.',
      icon: Bell,
      value: notificationLoading ? 'Syncing…' : `${notifications.filter((item) => !item.read).length} unread`,
      status: 'active',
      href: '/ecommerce/notifications',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <div className="space-y-3">
          <Badge className="bg-orange-500/10 text-orange-600">Integration Hub</Badge>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Workflow className="h-8 w-8 text-orange-600" /> Commerce Integrations
          </h1>
          <p className="text-muted-foreground">
            Validate component/page integration and monitor live data flow across commerce screens.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.title} className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-orange-600" />
                    <h2 className="font-semibold">{integration.title}</h2>
                  </div>
                  <Badge className="bg-green-500/10 text-green-700">{integration.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{integration.value}</span>
                  <Button asChild variant="outline" className="bg-transparent">
                    <Link href={integration.href}>
                      Open
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5 text-orange-600" /> Commerce QA flow
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Add products in Grocery/Live pages.</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Review synced cart totals in /ecommerce/cart and /checkout.</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Confirm wishlist + notifications API actions.</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Track order history and run reorder action.</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
