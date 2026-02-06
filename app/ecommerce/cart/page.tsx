'use client';

import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingCart, Zap, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
  stock: number;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Premium Silk Blouse',
      price: 89.99,
      quantity: 2,
      image: '/placeholder.jpg',
      size: 'M',
      color: 'Cream',
      stock: 42,
    },
    {
      id: '2',
      name: 'Classic Denim Jacket',
      price: 129.99,
      quantity: 1,
      image: '/placeholder.jpg',
      size: 'L',
      color: 'Navy',
      stock: 15,
    },
    {
      id: '3',
      name: 'Summer Linen Dress',
      price: 79.99,
      quantity: 1,
      image: '/placeholder.jpg',
      size: 'S',
      color: 'White',
      stock: 3,
    },
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = (subtotal + (shipping > 0 ? shipping : 0)) * 0.08;
  const discount = appliedPromo ? (subtotal * appliedPromo.discount) / 100 : 0;
  const total = subtotal + shipping + tax - discount;

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      setCartItems(
        cartItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
      );
    }
  };

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const applyPromo = () => {
    const validPromos: Record<string, number> = {
      SAVE10: 10,
      SUMMER20: 20,
      WELCOME15: 15,
    };

    if (validPromos[promoCode]) {
      setAppliedPromo({ code: promoCode, discount: validPromos[promoCode] });
      setPromoCode('');
    }
  };

  const recommendations = [
    { id: '4', name: 'Leather Accessories Pack', price: 49.99, image: '/placeholder.jpg' },
    { id: '5', name: 'Silk Scarf Set', price: 34.99, image: '/placeholder.jpg' },
    { id: '6', name: 'Designer Sunglasses', price: 149.99, image: '/placeholder.jpg' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-slate-400">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-slate-400 mb-6">Add items to get started</p>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">Continue Shopping</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="bg-slate-900 border-slate-800 p-6">
                  <div className="flex gap-6">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                          {(item.size || item.color) && (
                            <p className="text-sm text-slate-400">
                              {item.size && `Size: ${item.size}`}
                              {item.size && item.color ? ' • ' : ''}
                              {item.color && `Color: ${item.color}`}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-orange-400">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-slate-700 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              {/* Summary Card */}
              <Card className="bg-slate-900 border-slate-800 p-6 sticky top-4">
                <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4 pb-4 border-b border-slate-700">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {shipping > 0 && (
                    <div className="flex justify-between text-slate-300">
                      <span>Shipping</span>
                      <span>${shipping.toFixed(2)}</span>
                    </div>
                  )}
                  {shipping === 0 && (
                    <div className="flex justify-between text-green-400 text-sm">
                      <span>Free Shipping</span>
                      <span>Eligible!</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-green-400">
                      <span>{appliedPromo.code} ({appliedPromo.discount}% off)</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-xl font-bold text-white mb-6">
                  <span>Total</span>
                  <span className="text-orange-400">${total.toFixed(2)}</span>
                </div>

                {/* Promo Code */}
                <div className="mb-6 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded px-3 py-2 text-sm"
                    />
                    <Button
                      onClick={applyPromo}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-sm"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Try: SAVE10, SUMMER20, WELCOME15
                  </p>
                </div>

                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 mb-2">
                  Proceed to Checkout
                </Button>
                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white">
                  Continue Shopping
                </Button>
              </Card>

              {/* Recommendations */}
              <div>
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  Recommended for You
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <Card
                      key={rec.id}
                      className="bg-slate-900 border-slate-800 p-3 hover:border-orange-500 transition-colors cursor-pointer"
                    >
                      <div className="flex gap-3">
                        <img
                          src={rec.image || "/placeholder.svg"}
                          alt={rec.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white line-clamp-2 mb-2">
                            {rec.name}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-orange-400 font-bold">${rec.price}</span>
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7">
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
