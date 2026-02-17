"use client"

import { authClient } from "@/lib/auth/client"

export function useAuth() {
  const session = authClient.useSession()

  return {
    user: session.data?.user ?? null,
    isAuthenticated: Boolean(session.data?.user),
    isLoading: session.isPending,
    signIn: (email: string, password: string) => authClient.signIn.email({ email, password }),
    signUp: (email: string, password: string, userData?: { full_name?: string }) =>
      authClient.signUp.email({
        email,
        password,
        name: userData?.full_name,
      }),
    signOut: () => authClient.signOut(),
  }
}
