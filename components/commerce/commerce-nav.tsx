'use client';

import Link from 'next/link';
import { ShoppingBag, Zap, Package, BarChart3, Settings, Newspaper } from 'lucide-react';

export function CommerceNav() {
  const navItems = [
    {
      label: 'Shopping',
      href: '/ecommerce',
      icon: ShoppingBag,
      description: 'Browse products',
    },
    {
      label: 'Live Commerce',
      href: '/livecommerce',
      icon: Zap,
      description: 'Watch & shop live',
    },
    {
      label: 'Dashboard',
      href: '/ecommerce/dashboard',
      icon: BarChart3,
      description: 'Real-time inventory',
    },
    {
      label: 'Orders',
      href: '/ecommerce/orders',
      icon: Package,
      description: 'Order management',
    },
    {
      label: 'Payments',
      href: '/ecommerce/payments',
      icon: Newspaper,
      description: 'Payment links',
    },
    {
      label: 'Admin',
      href: '/ecommerce/admin',
      icon: Settings,
      description: 'Admin controls',
    },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors whitespace-nowrap text-sm"
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default CommerceNav;
