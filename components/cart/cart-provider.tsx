"use client"

import React from "react"

export type CartItem = {
  product_id: string
  name: string
  price: number
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void
  remove: (product_id: string) => void
  clear: () => void
  total: number
  checkout: (email: string) => Promise<{ order_id: string }>
}

const CartContext = React.createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([])

  const add: CartContextType["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.product_id === item.product_id)
      if (existing) {
        return prev.map((p) => (p.product_id === item.product_id ? { ...p, quantity: p.quantity + qty } : p))
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }

  const remove = (product_id: string) => setItems((prev) => prev.filter((p) => p.product_id !== product_id))
  const clear = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  async function checkout(email: string) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, items }),
    })
    if (!res.ok) throw new Error("Checkout failed")
    const data = (await res.json()) as { order_id: string }
    clear()
    return data
  }

  return <CartContext.Provider value={{ items, add, remove, clear, checkout, total }}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = React.useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
