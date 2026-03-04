"use client"

import { useEffect } from "react"
import { signOutWithRedirect } from "@/lib/auth/access-client"
import { Loader2 } from "lucide-react"

export default function LogoutPage() {
  useEffect(() => {
    // Soft delay for UX, then sign out
    const t = setTimeout(() => {
      signOutWithRedirect("/")
    }, 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Signing you out…</span>
      </div>
    </div>
  )
}
