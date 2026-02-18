"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { setLastLoginMethod } from "@/lib/auth/last-login-method"

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
            cancel_on_tap_outside?: boolean
            auto_select?: boolean
          }) => void
          prompt: () => void
        }
      }
    }
  }
}

interface GoogleOneTapProps {
  callbackUrl?: string
}

export function GoogleOneTap({ callbackUrl = "/dashboard" }: GoogleOneTapProps) {
  const router = useRouter()

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || typeof window === "undefined") {
      return
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-provider="google-one-tap"]')
    if (existing) {
      initializeOneTap(clientId)
      return
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.dataset.provider = "google-one-tap"
    script.onload = () => initializeOneTap(clientId)
    document.head.appendChild(script)

    function initializeOneTap(activeClientId: string) {
      window.google?.accounts?.id?.initialize({
        client_id: activeClientId,
        callback: async ({ credential }) => {
          if (!credential) {
            return
          }

          const response = await fetch("/api/auth/google-one-tap/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential, callbackUrl }),
          })

          const data = (await response.json()) as { redirectUrl?: string }
          setLastLoginMethod("google-one-tap")
          if (data.redirectUrl) {
            router.push(data.redirectUrl)
            return
          }

          router.push(callbackUrl)
        },
        cancel_on_tap_outside: false,
        auto_select: true,
      })
      window.google?.accounts?.id?.prompt()
    }
  }, [callbackUrl, router])

  return null
}
