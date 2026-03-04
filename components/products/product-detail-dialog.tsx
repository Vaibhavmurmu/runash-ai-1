"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { detectArCapabilities, getArLaunchUrl, type ArCapabilities } from "./ar-capabilities"
import { trackArEngagement } from "./ar-engagement"
import { ProductMediaViewer } from "./product-media-viewer"
import type { Product } from "@/lib/repositories/products"

const DEFAULT_CAPABILITIES: ArCapabilities = {
  webxr: false,
  quickLook: false,
  sceneViewer: false,
  supported: false,
  hint: "Checking AR compatibility...",
  userAgent: "unknown",
}

interface ProductDetailDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductDetailDialog({ product, open, onOpenChange }: ProductDetailDialogProps) {
  const [capabilities, setCapabilities] = useState<ArCapabilities>(DEFAULT_CAPABILITIES)
  const [checking, setChecking] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const modelUrl = useMemo(
    () => (product ? `https://modelviewer.dev/shared-assets/models/Astronaut.glb?product=${encodeURIComponent(product.id)}` : null),
    [product],
  )

  useEffect(() => {
    if (!open || !product) return

    setChecking(true)
    void detectArCapabilities().then(async (result) => {
      setCapabilities(result)
      setChecking(false)
      await trackArEngagement({
        productId: product.id,
        eventType: "ar_cta_viewed",
        metadata: {
          arSupported: result.supported,
          webxr: result.webxr,
          quickLook: result.quickLook,
          sceneViewer: result.sceneViewer,
        },
      })
    })
  }, [open, product])

  if (!product) return null

  const arLaunchUrl = modelUrl ? getArLaunchUrl(modelUrl, capabilities) : null
  const ctaDisabled = !arLaunchUrl || checking

  const handleLaunchAr = async () => {
    if (!arLaunchUrl) return
    setLaunchError(null)
    try {
      window.open(arLaunchUrl, "_blank", "noopener,noreferrer")
      await trackArEngagement({
        productId: product.id,
        eventType: "ar_cta_clicked",
        metadata: {
          target: capabilities.quickLook ? "quick_look" : capabilities.sceneViewer ? "scene_viewer" : "webxr",
        },
      })
    } catch {
      const message = "Unable to launch AR on this device."
      setLaunchError(message)
      await trackArEngagement({
        productId: product.id,
        eventType: "ar_launch_failed",
        metadata: { reason: message },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.description || "Inspect product media and launch AR preview."}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <ProductMediaViewer
            productName={product.name}
            imageUrl={product.image_url}
            modelUrl={modelUrl}
            enable3dFallback={!capabilities.supported}
            onFallbackUsed={() => {
              void trackArEngagement({
                productId: product.id,
                eventType: "ar_fallback_used",
                metadata: { source: "media_fallback" },
              })
            }}
            onScaleChange={(scale) => {
              void trackArEngagement({
                productId: product.id,
                eventType: "ar_scale_changed",
                metadata: { scale },
              })
            }}
            onReset={() => {
              void trackArEngagement({
                productId: product.id,
                eventType: "ar_reset",
              })
            }}
          />

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={product.in_stock ? "default" : "destructive"}>{product.in_stock ? "In Stock" : "Out of Stock"}</Badge>
              <Badge variant="secondary">${product.price}</Badge>
              <Badge variant="outline">{product.category ?? "General"}</Badge>
            </div>

            <Alert>
              <AlertTitle>Device compatibility</AlertTitle>
              <AlertDescription>{checking ? "Detecting AR support..." : capabilities.hint}</AlertDescription>
            </Alert>

            <Button disabled={ctaDisabled} className="w-full" onClick={handleLaunchAr}>
              View in your space
            </Button>
            {ctaDisabled && <p className="text-xs text-muted-foreground">AR launch is disabled for unsupported devices/browsers.</p>}
            {launchError && <p className="text-xs text-destructive">{launchError}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
