"use client"

import { useCallback, useEffect, useState } from "react"
import { useCart } from "@/contexts/cart-context"
import type { Product } from "@/types/cart"

type WishlistItem = {
  id: string
  name: string
  price: number
  originalPrice: number
  addedDate: string
  inStock: boolean
  emoji: string
  image?: string
}

type CommerceNotification = {
  id: string
  type: "delivery" | "promo" | "order" | "alert"
  title: string
  message: string
  timestamp: string
  read: boolean
}

type OrderHistoryItem = {
  id: number
  status: string
  total: number
  created_at: string
  items: Array<{ name: string; quantity: number; price: number }>
}

type RemoteState<T> = {
  data: T
  loading: boolean
  error: string | null
}

const toCartProduct = (item: { id: string; name: string; price: number; image?: string }): Product => ({
  id: item.id,
  name: item.name,
  description: item.name,
  price: item.price,
  category: { id: "ecommerce", name: "Ecommerce" },
  isOrganic: false,
  sustainabilityScore: 0,
  image: item.image ?? "/placeholder.jpg",
  inStock: true,
  certifications: [],
})

export function useCommerceCartActions() {
  const { addToCart } = useCart()
  const addItemToCart = useCallback(
    (item: { id: string; name: string; price: number; image?: string }) => {
      addToCart(toCartProduct(item), 1)
    },
    [addToCart],
  )

  return { addItemToCart }
}

export function useWishlistData() {
  const [state, setState] = useState<RemoteState<WishlistItem[]>>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch("/api/ecommerce/wishlist", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to load wishlist")
      const body = (await response.json()) as { items: WishlistItem[] }
      setState({ data: body.items, loading: false, error: null })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "Failed to load" }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const removeItem = useCallback(
    async (id: string) => {
      const previous = state.data
      setState((prev) => ({ ...prev, data: prev.data.filter((item) => item.id !== id), error: null }))
      const response = await fetch(`/api/ecommerce/wishlist/${id}`, { method: "DELETE" })
      if (!response.ok) {
        setState((prev) => ({ ...prev, data: previous, error: "Failed to remove item" }))
      }
    },
    [state.data],
  )

  return { ...state, reload: load, removeItem }
}

export function useOrderHistoryData() {
  const [state, setState] = useState<RemoteState<OrderHistoryItem[]>>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch("/api/orders", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to load order history")
      const body = (await response.json()) as OrderHistoryItem[]
      setState({ data: body, loading: false, error: null })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "Failed to load" }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, reload: load }
}

export function useNotificationsData() {
  const [state, setState] = useState<RemoteState<CommerceNotification[]>>({ data: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch("/api/ecommerce/notifications", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to load notifications")
      const body = (await response.json()) as { items: CommerceNotification[] }
      setState({ data: body.items, loading: false, error: null })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "Failed to load" }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markAsRead = useCallback(
    async (id: string) => {
      const previous = state.data
      setState((prev) => ({
        ...prev,
        data: prev.data.map((item) => (item.id === id ? { ...item, read: true } : item)),
      }))

      const response = await fetch(`/api/ecommerce/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })

      if (!response.ok) {
        setState((prev) => ({ ...prev, data: previous, error: "Failed to update notification" }))
      }
    },
    [state.data],
  )

  const removeNotification = useCallback(
    async (id: string) => {
      const previous = state.data
      setState((prev) => ({ ...prev, data: prev.data.filter((item) => item.id !== id), error: null }))
      const response = await fetch(`/api/ecommerce/notifications/${id}`, { method: "DELETE" })
      if (!response.ok) {
        setState((prev) => ({ ...prev, data: previous, error: "Failed to delete notification" }))
      }
    },
    [state.data],
  )

  return { ...state, reload: load, markAsRead, removeNotification }
}

export function useProfileData() {
  const [state, setState] = useState<RemoteState<Record<string, unknown> | null>>({ data: null, loading: true, error: null })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch("/api/profile", { cache: "no-store" })
      if (!response.ok) throw new Error("Failed to load profile")
      const body = (await response.json()) as { profile: Record<string, unknown> }
      setState({ data: body.profile, loading: false, error: null })
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : "Failed to load" }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, reload: load }
}
