"use client"

import type React from "react"

import { CartProvider } from "@/contexts/cart-context"
import { AuthUIProvider } from "@/components/auth"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthUIProvider>
      <CartProvider>{children}</CartProvider>
    </AuthUIProvider>
  )
}
