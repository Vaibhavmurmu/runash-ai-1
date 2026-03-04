"use client"

import { authClient } from "@/lib/auth/client"

type AuthSessionUser = {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
  image?: string | null
}

export function useAuthSession() {
  const session = authClient.useSession()

  return {
    data: session.data
      ? {
          user: session.data.user as AuthSessionUser,
          session: session.data.session,
        }
      : null,
    status: session.isPending ? "loading" : session.data?.user ? "authenticated" : "unauthenticated",
    isPending: session.isPending,
  } as const
}

export async function getAuthSession() {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export function signOutWithRedirect(callbackUrl = "/") {
  return authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = callbackUrl
      },
    },
  })
}

