"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

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

interface CartContextType {
  items: CartItem[]
  savedItems: SavedItem[]
  itemCount: number
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  appliedCoupon: AppliedCoupon | null
  recentlyViewed: string[]
  addItem: (item: CartItem) => void
  updateQuantity: (id: string, quantity: number) => void
  removeItem: (id: string) => void
  saveForLater: (id: string) => void
  moveToCart: (id: string) => void
  removeSavedItem: (id: string) => void
  clearCart: () => void
  applyCoupon: (code: string) => Promise<boolean>
  removeCoupon: () => void
  addToRecentlyViewed: (productId: string) => void
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  isItemInCart: (id: string) => boolean
  isItemSaved: (id: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Create a simple event tracking function that doesn't depend on useAnalytics
const trackCartEvent = (eventName: string, eventData: Record<string, any>) => {
  // In a real app, this would be more sophisticated
  // For now, just log to console
  console.log(`Cart event: ${eventName}`, eventData)

  // If window is defined and analytics exists, try to use it
  if (typeof window !== "undefined" && (window as any).trackAnalyticsEvent) {
    try {
      ;(window as any).trackAnalyticsEvent(eventName, eventData)
    } catch (error) {
      console.error("Failed to track event with analytics:", error)
    }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [items, setItems] = useState<CartItem[]>([])
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const savedCart = localStorage.getItem("cart")
      if (savedCart) {
        setItems(JSON.parse(savedCart))
      }

      const savedForLater = localStorage.getItem("savedItems")
      if (savedForLater) {
        setSavedItems(JSON.parse(savedForLater))
      }

      const viewed = localStorage.getItem("recentlyViewed")
      if (viewed) {
        setRecentlyViewed(JSON.parse(viewed))
      }

      const coupon = localStorage.getItem("appliedCoupon")
      if (coupon) {
        setAppliedCoupon(JSON.parse(coupon))
      }
    } catch (error) {
      console.error("Failed to parse cart data from localStorage:", error)
    }
  }, [])

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  // Save savedItems to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("savedItems", JSON.stringify(savedItems))
  }, [savedItems])

  // Save recentlyViewed to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed))
  }, [recentlyViewed])

  // Save appliedCoupon to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("appliedCoupon", JSON.stringify(appliedCoupon))
  }, [appliedCoupon])

  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0)

  // Calculate tax (e.g., 8.25%)
  const tax = subtotal * 0.0825

  // Calculate shipping (free over $100, otherwise $5.99)
  const shipping = subtotal > 100 ? 0 : 5.99

  // Calculate discount from coupon
  const discount = appliedCoupon
    ? appliedCoupon.discountType === "percentage"
      ? subtotal * (appliedCoupon.discountValue / 100)
      : appliedCoupon.discountType === "fixed"
        ? appliedCoupon.discountValue
        : appliedCoupon.discountType === "shipping"
          ? shipping
          : 0
    : 0

  // Calculate total
  const total = subtotal + tax + (appliedCoupon?.discountType === "shipping" ? 0 : shipping) - discount

  const addItem = (newItem: CartItem) => {
    setItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex((item) => item.id === newItem.id)

      if (existingItemIndex > -1) {
        // Item exists, update quantity
        const updatedItems = [...prevItems]
        const existingItem = updatedItems[existingItemIndex]
        const newQuantity = existingItem.quantity + newItem.quantity

        // Check if new quantity exceeds max quantity
        if (existingItem.maxQuantity && newQuantity > existingItem.maxQuantity) {
          toast({
            title: "Maximum quantity reached",
            description: `You can only add up to ${existingItem.maxQuantity} of this item to your cart.`,
            variant: "destructive",
          })
          updatedItems[existingItemIndex].quantity = existingItem.maxQuantity
        } else {
          updatedItems[existingItemIndex].quantity = newQuantity
        }

        // Track event
        trackCartEvent("cart_item_updated", {
          productId: newItem.id,
          productName: newItem.name,
          quantity: updatedItems[existingItemIndex].quantity,
          price: newItem.price,
        })

        return updatedItems
      } else {
        // Item doesn't exist, add it
        // Track event
        trackCartEvent("cart_item_added", {
          productId: newItem.id,
          productName: newItem.name,
          quantity: newItem.quantity,
          price: newItem.price,
        })

        return [...prevItems, newItem]
      }
    })

    // Remove from saved items if it exists there
    setSavedItems((prevItems) => prevItems.filter((item) => item.id !== newItem.id))

    // Open cart when adding items
    setIsOpen(true)
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }

    setItems((prevItems) => {
      const itemIndex = prevItems.findIndex((item) => item.id === id)
      if (itemIndex === -1) return prevItems

      const item = prevItems[itemIndex]

      // Check if new quantity exceeds max quantity
      if (item.maxQuantity && quantity > item.maxQuantity) {
        toast({
          title: "Maximum quantity reached",
          description: `You can only add up to ${item.maxQuantity} of this item to your cart.`,
          variant: "destructive",
        })

        const updatedItems = [...prevItems]
        updatedItems[itemIndex] = { ...item, quantity: item.maxQuantity }

        // Track event
        trackCartEvent("cart_item_updated", {
          productId: item.id,
          productName: item.name,
          quantity: item.maxQuantity,
          price: item.price,
        })

        return updatedItems
      }

      const updatedItems = [...prevItems]
      updatedItems[itemIndex] = { ...item, quantity }

      // Track event
      trackCartEvent("cart_item_updated", {
        productId: item.id,
        productName: item.name,
        quantity,
        price: item.price,
      })

      return updatedItems
    })
  }

  const removeItem = (id: string) => {
    setItems((prevItems) => {
      const itemToRemove = prevItems.find((item) => item.id === id)
      if (itemToRemove) {
        // Track event
        trackCartEvent("cart_item_removed", {
          productId: itemToRemove.id,
          productName: itemToRemove.name,
          price: itemToRemove.price,
        })
      }

      return prevItems.filter((item) => item.id !== id)
    })
  }

  const saveForLater = (id: string) => {
    const itemToSave = items.find((item) => item.id === id)
    if (!itemToSave) return

    // Add to saved items
    setSavedItems((prevSaved) => [
      ...prevSaved,
      {
        id: itemToSave.id,
        name: itemToSave.name,
        price: itemToSave.price,
        image: itemToSave.image,
        dateAdded: new Date(),
        variant: itemToSave.variant,
        color: itemToSave.color,
      },
    ])

    // Remove from cart
    removeItem(id)

    // Track event
    trackCartEvent("item_saved_for_later", {
      productId: itemToSave.id,
      productName: itemToSave.name,
      price: itemToSave.price,
    })

    toast({
      title: "Item saved for later",
      description: `${itemToSave.name} has been saved for later.`,
    })
  }

  const moveToCart = (id: string) => {
    const savedItem = savedItems.find((item) => item.id === id)
    if (!savedItem) return

    // Add to cart
    addItem({
      id: savedItem.id,
      name: savedItem.name,
      price: savedItem.price,
      quantity: 1,
      image: savedItem.image,
      variant: savedItem.variant,
      color: savedItem.color,
    })

    // Remove from saved items
    removeSavedItem(id)

    // Track event
    trackCartEvent("saved_item_moved_to_cart", {
      productId: savedItem.id,
      productName: savedItem.name,
      price: savedItem.price,
    })

    toast({
      title: "Item moved to cart",
      description: `${savedItem.name} has been moved to your cart.`,
    })
  }

  const removeSavedItem = (id: string) => {
    setSavedItems((prevItems) => {
      const itemToRemove = prevItems.find((item) => item.id === id)
      if (itemToRemove) {
        // Track event
        trackCartEvent("saved_item_removed", {
          productId: itemToRemove.id,
          productName: itemToRemove.name,
          price: itemToRemove.price,
        })
      }

      return prevItems.filter((item) => item.id !== id)
    })
  }

  const clearCart = () => {
    if (items.length === 0) return

    // Track event
    trackCartEvent("cart_cleared", {
      itemCount: items.length,
      totalValue: subtotal,
    })

    setItems([])
    setAppliedCoupon(null)
  }

  const applyCoupon = async (code: string): Promise<boolean> => {
    // In a real app, this would validate the coupon with an API
    // For now, we'll simulate some coupon codes
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const couponCodes = {
      WELCOME10: {
        discountType: "percentage" as const,
        discountValue: 10,
        minimumPurchase: 0,
      },
      SAVE20: {
        discountType: "percentage" as const,
        discountValue: 20,
        minimumPurchase: 100,
      },
      FREESHIP: {
        discountType: "shipping" as const,
        discountValue: shipping,
        minimumPurchase: 50,
      },
      FLAT15: {
        discountType: "fixed" as const,
        discountValue: 15,
        minimumPurchase: 75,
      },
    }

    const upperCode = code.toUpperCase()
    const coupon = couponCodes[upperCode as keyof typeof couponCodes]

    if (!coupon) {
      toast({
        title: "Invalid coupon code",
        description: "The coupon code you entered is invalid or expired.",
        variant: "destructive",
      })
      return false
    }

    if (coupon.minimumPurchase > subtotal) {
      toast({
        title: "Minimum purchase not met",
        description: `This coupon requires a minimum purchase of $${coupon.minimumPurchase.toFixed(2)}.`,
        variant: "destructive",
      })
      return false
    }

    setAppliedCoupon({
      code: upperCode,
      ...coupon,
    })

    // Track event
    trackCartEvent("coupon_applied", {
      couponCode: upperCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      cartValue: subtotal,
    })

    toast({
      title: "Coupon applied",
      description: `Coupon ${upperCode} has been applied to your order.`,
    })

    return true
  }

  const removeCoupon = () => {
    if (!appliedCoupon) return

    // Track event
    trackCartEvent("coupon_removed", {
      couponCode: appliedCoupon.code,
      discountType: appliedCoupon.discountType,
      discountValue: appliedCoupon.discountValue,
    })

    setAppliedCoupon(null)

    toast({
      title: "Coupon removed",
      description: "The coupon has been removed from your order.",
    })
  }

  const addToRecentlyViewed = (productId: string) => {
    setRecentlyViewed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((id) => id !== productId)
      // Add to beginning of array
      return [productId, ...filtered].slice(0, 10) // Keep only 10 most recent
    })
  }

  const isItemInCart = (id: string) => {
    return items.some((item) => item.id === id)
  }

  const isItemSaved = (id: string) => {
    return savedItems.some((item) => item.id === id)
  }

  const openCart = () => {
    setIsOpen(true)

    // Track event
    trackCartEvent("cart_opened", {
      itemCount,
      cartValue: subtotal,
    })
  }

  const closeCart = () => {
    setIsOpen(false)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        savedItems,
        itemCount,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        appliedCoupon,
        recentlyViewed,
        addItem,
        updateQuantity,
        removeItem,
        saveForLater,
        moveToCart,
        removeSavedItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        addToRecentlyViewed,
        isOpen,
        openCart,
        closeCart,
        isItemInCart,
        isItemSaved,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
