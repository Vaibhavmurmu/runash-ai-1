"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ShoppingCart, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { useCommerceCartActions } from "@/hooks/use-commerce-data";

export default function CartPage() {
  const router = useRouter();
  const { state, removeFromCart, updateQuantity } = useCart();
  const { addItemToCart } = useCommerceCartActions();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const cartItems = state.cart.items;
  const { subtotal, shipping, tax, total } = state.totals;

  const recommendations = useMemo(
    () => [
      {
        id: "4",
        name: "Leather Accessories Pack",
        price: 49.99,
        image: "/placeholder.jpg",
      },
      {
        id: "5",
        name: "Silk Scarf Set",
        price: 34.99,
        image: "/placeholder.jpg",
      },
      {
        id: "6",
        name: "Designer Sunglasses",
        price: 149.99,
        image: "/placeholder.jpg",
      },
    ],
    [],
  );

  const handleCheckout = async () => {
    setIsCheckoutLoading(true);
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Shopping Cart</h1>
          <p className="text-sm text-slate-400 sm:text-base">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in
            your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-slate-400 mb-6">Add items to get started</p>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => router.push("/grocery")}
            >
              Continue Shopping
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cartItems.map((item) => (
                <Card
                  key={item.id}
                  className="border-slate-800 bg-slate-900 p-4 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                    <img
                      src={item.product.image || "/placeholder.svg"}
                      alt={item.product.name}
                      className="h-28 w-full rounded-lg object-cover sm:h-24 sm:w-24"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="mb-1 pr-1 text-base font-bold text-white sm:text-lg">
                          {item.product.name}
                        </h3>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="shrink-0 text-slate-400 transition-colors hover:text-red-400"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xl font-bold text-orange-400 sm:text-2xl">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                        <div className="flex min-w-[120px] items-center justify-between gap-2 rounded-lg bg-slate-800 p-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="p-1 hover:bg-slate-700 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="p-1 hover:bg-slate-700 rounded"
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

            <div className="space-y-4">
              <Card className="sticky bottom-2 border-slate-800 bg-slate-900 p-4 sm:bottom-3 sm:p-6 lg:top-4 lg:bottom-auto">
                <h2 className="mb-3 text-lg font-bold text-white sm:mb-4 sm:text-xl">
                  Order Summary
                </h2>
                <div className="mb-4 space-y-2 border-b border-slate-700 pb-4 text-sm sm:space-y-3 sm:text-base">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between text-lg font-bold text-white sm:mb-6 sm:text-xl">
                  <span>Total</span>
                  <span className="text-orange-400">${total.toFixed(2)}</span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    className="h-11 w-full bg-orange-600 font-bold text-white hover:bg-orange-700 sm:h-12 sm:flex-1"
                    onClick={handleCheckout}
                    disabled={isCheckoutLoading}
                  >
                    {isCheckoutLoading
                      ? "Starting Checkout..."
                      : "Proceed to Checkout"}
                  </Button>
                  <Button
                    className="w-full bg-slate-800 text-white hover:bg-slate-700 sm:flex-1"
                    onClick={() => router.push("/grocery")}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </Card>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                  <Zap className="w-4 h-4 text-orange-400" />
                  Recommended for You
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <Card
                      key={rec.id}
                      className="border-slate-800 bg-slate-900 p-3 transition-colors hover:border-orange-500"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <img
                          src={rec.image || "/placeholder.svg"}
                          alt={rec.name}
                          className="h-28 w-full rounded object-cover sm:h-16 sm:w-16"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white line-clamp-2 mb-2">
                            {rec.name}
                          </p>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-orange-400 font-bold">
                              ${rec.price}
                            </span>
                            <Button
                              className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7"
                              onClick={() => addItemToCart(rec)}
                            >
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
