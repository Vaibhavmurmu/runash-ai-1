"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth as useSharedAuth } from "@/lib/hooks/use-auth"

interface User {
  id: string
  email?: string
  name?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const auth = useSharedAuth()

  const value: AuthContextType = {
    user: auth.user
      ? {
          id: String(auth.user.id),
          email: auth.user.email ?? "",
          name: auth.user.name ?? undefined,
        }
      : null,
    loading: auth.isLoading,
    signIn: async (email, password) => {
      const result = await auth.signIn(email, password)
      if ((result as { error?: unknown })?.error) {
        return { error: (result as { error?: unknown }).error }
      }

      toast.success("Successfully signed in!")
      router.push("/")
      return { error: null }
    },
    signUp: async (email, password, userData) => {
      const result = await auth.signUp(email, password, userData)
      if ((result as { error?: unknown })?.error) {
        return { error: (result as { error?: unknown }).error }
      }

      toast.success("Account created successfully!")
      return { error: null }
    },
    signOut: async () => {
      const result = await auth.signOut()
      if ((result as { error?: unknown })?.error) {
        toast.error("Error signing out")
        return
      }

      toast.success("Successfully signed out!")
      router.push("/login")
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
