"use client"

import { useMemo } from "react"
import { useCart as useCanonicalCart } from "@/contexts/cart-context"
import type { Product } from "@/types/cart"

/**
 * @deprecated Use `@/contexts/cart-context` directly.
 * This adapter remains for legacy callers during migration.
 */
export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
  maxQuantity?: number
  variant?: string
  color?: string
}

export interface SavedItem {
  id: string
  name: string
  price: number
  image: string
  dateAdded: Date
  variant?: string
  color?: string
}

export interface AppliedCoupon {
  code: string
  discountType: "percentage" | "fixed" | "shipping"
  discountValue: number
  minimumPurchase?: number
  expiryDate?: Date
}

const toLegacyCartItem = (item: { id: string; quantity: number; product: Product }): CartItem => ({
  id: item.id,
  name: item.product.name,
  price: item.product.price,
  quantity: item.quantity,
  image: item.product.image,
})

const toCanonicalProduct = (item: CartItem): Product => ({
  id: item.id,
  name: item.name,
  description: item.name,
  price: item.price,
  category: { id: "legacy", name: "Legacy" },
  isOrganic: false,
  sustainabilityScore: 0,
  image: item.image,
  inStock: true,
  certifications: [],
})

export function useCart() {
  const cart = useCanonicalCart()

  return useMemo(() => {
    const items = cart.state.cart.items.map(toLegacyCartItem)
    const itemCount = cart.getItemCount()
    const { subtotal, tax, shipping, discount, total } = cart.state.totals

    return {
      items,
      savedItems: [] as SavedItem[],
      itemCount,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      appliedCoupon: null as AppliedCoupon | null,
      recentlyViewed: [] as string[],
      addItem: (item: CartItem) => cart.addToCart(toCanonicalProduct(item), item.quantity),
      updateQuantity: cart.updateQuantity,
      removeItem: cart.removeFromCart,
      saveForLater: () => {},
      moveToCart: () => {},
      removeSavedItem: () => {},
      clearCart: cart.clearCart,
      applyCoupon: async () => false,
      removeCoupon: () => {},
      addToRecentlyViewed: () => {},
      isOpen: cart.state.isOpen,
      openCart: () => {
        if (!cart.state.isOpen) {
          cart.toggleCart()
        }
      },
      closeCart: () => {
        if (cart.state.isOpen) {
          cart.toggleCart()
        }
      },
      isItemInCart: (id: string) => items.some((item) => item.id === id),
      isItemSaved: () => false,
    }
  }, [cart])
}
