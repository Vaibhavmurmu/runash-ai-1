'use client';

import { useState } from 'react';
import { Menu, Search, ShoppingCart, Bell, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function StreamNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              LiveMarket
            </div>
          </div>

          <div className="hidden md:flex flex-1 mx-8 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or streams..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-orange-500 rounded-full" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-5 w-5 bg-orange-500 text-xs flex items-center justify-center rounded-full text-white">
                2
              </span>
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              Home
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Live Streams
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Orders
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Wishlist
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
