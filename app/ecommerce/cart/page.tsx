'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingCart, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { useCommerceCartActions } from '@/hooks/use-commerce-data';

export default function CartPage() {
  const router = useRouter();
  const { state, removeFromCart, updateQuantity } = useCart();
  const { addItemToCart } = useCommerceCartActions();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const cartItems = state.cart.items;
  const { subtotal, shipping, tax, total } = state.totals;

  const recommendations = useMemo(
    () => [
      { id: '4', name: 'Leather Accessories Pack', price: 49.99, image: '/placeholder.jpg' },
      { id: '5', name: 'Silk Scarf Set', price: 34.99, image: '/placeholder.jpg' },
      { id: '6', name: 'Designer Sunglasses', price: 149.99, image: '/placeholder.jpg' },
    ],
    [],
  );

  const handleCheckout = async () => {
    setIsCheckoutLoading(true);
    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => router.push('/grocery')}>
              Continue Shopping
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="bg-slate-900 border-slate-800 p-6">
                  <div className="flex gap-6">
                    <img src={item.product.image || '/placeholder.svg'} alt={item.product.name} className="w-24 h-24 object-cover rounded-lg" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white mb-1">{item.product.name}</h3>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-orange-400">${(item.product.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-slate-700 rounded">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-slate-700 rounded">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card className="bg-slate-900 border-slate-800 p-6 sticky top-4">
                <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4 pb-4 border-b border-slate-700">
                  <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Shipping</span><span>${shipping.toFixed(2)}</span></div>
                  <div className="flex justify-between text-slate-300"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
                </div>

                <div className="flex justify-between text-xl font-bold text-white mb-6">
                  <span>Total</span>
                  <span className="text-orange-400">${total.toFixed(2)}</span>
                </div>

                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 mb-2" onClick={handleCheckout} disabled={isCheckoutLoading}>
                  {isCheckoutLoading ? 'Starting Checkout...' : 'Proceed to Checkout'}
                </Button>
                <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={() => router.push('/grocery')}>
                  Continue Shopping
                </Button>
              </Card>

              <div>
                <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  Recommended for You
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="bg-slate-900 border-slate-800 p-3 hover:border-orange-500 transition-colors">
                      <div className="flex gap-3">
                        <img src={rec.image || '/placeholder.svg'} alt={rec.name} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white line-clamp-2 mb-2">{rec.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-orange-400 font-bold">${rec.price}</span>
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7" onClick={() => addItemToCart(rec)}>
                              Add to Cart
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
