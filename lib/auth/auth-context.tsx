"use client"

import type React from "react"
import { createContext, useContext, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { authClient } from "@/lib/auth/client"

interface User {
  id: string
  email: string
  full_name?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const session = authClient.useSession()

  const value = useMemo<AuthContextType>(() => {
    const currentUser = session.data?.user

    return {
      user: currentUser
        ? {
            id: String(currentUser.id),
            email: currentUser.email ?? "",
            full_name: currentUser.name ?? undefined,
          }
        : null,
      loading: session.isPending,
      signIn: async (email: string, password: string) => {
        try {
          const result = await authClient.signIn.email({ email, password })
          if (result.error) {
            return { error: result.error }
          }

          toast.success("Successfully signed in!")
          router.push("/")
          return { error: null }
        } catch (error) {
          return { error: { message: "Network error. Please try again." } }
        }
      },
      signUp: async (email: string, password: string, userData: any) => {
        try {
          const result = await authClient.signUp.email({
            email,
            password,
            name: userData?.full_name,
          })

          if (result.error) {
            return { error: result.error }
          }

          toast.success("Account created successfully!")
          return { error: null }
        } catch (error) {
          return { error: { message: "Network error. Please try again." } }
        }
      },
      signOut: async () => {
        const result = await authClient.signOut()
        if (result.error) {
          toast.error("Error signing out")
          return
        }

        toast.success("Successfully signed out!")
        router.push("/login")
      },
    }
  }, [router, session.data?.user, session.isPending])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
