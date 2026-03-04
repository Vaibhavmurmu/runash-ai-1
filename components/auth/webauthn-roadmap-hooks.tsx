"use client"

import { useEffect, useState } from "react"
import { Fingerprint, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WebAuthnRoadmapHooks() {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "PublicKeyCredential" in window)
  }, [])

  const emitRoadmapEvent = (intent: "passkey" | "biometric") => {
    window.dispatchEvent(
      new CustomEvent("runash:auth:webauthn-intent", {
        detail: { intent, supported, timestamp: Date.now() },
      }),
    )
  }

  return (
    <div className="rounded-lg border border-orange-200/70 bg-orange-50/70 p-4">
      <p className="mb-3 text-sm font-medium text-orange-900">Passkey/Biometric login roadmap</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => emitRoadmapEvent("passkey")}>
          <Fingerprint className="mr-2 h-4 w-4" />
          Try passkey hook
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => emitRoadmapEvent("biometric")}>
          <Shield className="mr-2 h-4 w-4" />
          Try biometric hook
        </Button>
      </div>
      <p className="mt-2 text-xs text-orange-800">
        {supported
          ? "WebAuthn is supported on this device. Hooks are active for roadmap instrumentation."
          : "WebAuthn is not supported on this device yet; hooks still emit fallback roadmap events."}
      </p>
    </div>
  )
}
