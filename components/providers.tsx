"use client"

import type React from "react"

import { CartProvider } from "@/contexts/cart-context"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return <CartProvider>{children}</CartProvider>
}
