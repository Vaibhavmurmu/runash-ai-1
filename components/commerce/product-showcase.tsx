'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Star, Heart, Share2 } from 'lucide-react';
import Image from 'next/image';

export function ProductShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="relative h-96 rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="h-64 w-64 bg-gradient-to-b from-orange-400/20 to-orange-600/20 rounded-lg flex items-center justify-center">
            <span className="text-6xl">👕</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-orange-500 font-semibold text-sm">Premium Collection</p>
              <h1 className="text-4xl font-bold mt-2">Signature Tee</h1>
            </div>
            <Button variant="ghost" size="icon">
              <Heart className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-orange-500 text-orange-500" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">(428 reviews)</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-bold">$89.99</p>
          <p className="text-muted-foreground">Premium organic cotton with sustainable production practices</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold mb-2">Size</p>
            <div className="flex gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                <Button
                  key={size}
                  variant={size === 'M' ? 'default' : 'outline'}
                  size="sm"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Color</p>
            <div className="flex gap-2">
              {['#000000', '#FFFFFF', '#FF6B35', '#004E89'].map((color) => (
                <button
                  key={color}
                  className="h-8 w-8 rounded-full border-2 border-border hover:border-orange-500 transition"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button size="lg" className="flex-1 bg-orange-600 hover:bg-orange-700">
            Add to Cart
          </Button>
          <Button size="lg" variant="outline" className="flex-1 bg-transparent">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
          <p className="font-semibold">Free Shipping & Returns</p>
          <p className="text-muted-foreground">On orders over $50</p>
        </div>
      </div>
    </div>
  );
}
