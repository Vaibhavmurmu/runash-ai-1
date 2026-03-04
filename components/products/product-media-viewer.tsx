"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface ProductMediaViewerProps {
  productName: string
  imageUrl: string | null
  modelUrl: string | null
  enable3dFallback: boolean
  onFallbackUsed?: () => void
  onScaleChange?: (scale: number) => void
  onReset?: () => void
}

export function ProductMediaViewer({
  productName,
  imageUrl,
  modelUrl,
  enable3dFallback,
  onFallbackUsed,
  onScaleChange,
  onReset,
}: ProductMediaViewerProps) {
  const images = useMemo(() => [imageUrl, "/placeholder.svg?height=400&width=400"].filter(Boolean) as string[], [imageUrl])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [show3dFallback, setShow3dFallback] = useState(enable3dFallback)
  const [frameLoading, setFrameLoading] = useState(true)
  const [frameError, setFrameError] = useState(false)
  const [scale, setScale] = useState(1)

  const activeImage = images[Math.min(activeImageIndex, images.length - 1)]

  useEffect(() => {
    setShow3dFallback(enable3dFallback)
  }, [enable3dFallback])

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/20 p-2">
        {show3dFallback && modelUrl ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>3D preview fallback</span>
              <Badge variant="secondary">Scale: {(scale * 100).toFixed(0)}%</Badge>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-md border bg-black/5">
              {frameLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D preview...
                </div>
              )}
              {frameError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-xs text-destructive">
                  3D preview failed to load. Please use image media fallback.
                </div>
              )}
              <iframe
                title={`${productName} 3D preview`}
                src={`https://modelviewer.dev/editor/?model=${encodeURIComponent(modelUrl)}`}
                className="h-full w-full origin-center transition-transform duration-200"
                style={{ transform: `scale(${scale})` }}
                onLoad={() => {
                  setFrameLoading(false)
                  setFrameError(false)
                }}
                onError={() => {
                  setFrameLoading(false)
                  setFrameError(true)
                  setShow3dFallback(false)
                  onFallbackUsed?.()
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setScale((prev) => {
                    const next = Math.max(0.8, prev - 0.1)
                    onScaleChange?.(next)
                    return next
                  })
                }}
              >
                Scale -
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setScale((prev) => {
                    const next = Math.min(1.5, prev + 0.1)
                    onScaleChange?.(next)
                    return next
                  })
                }}
              >
                Scale +
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setScale(1)
                  onReset?.()
                }}
              >
                Reset
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShow3dFallback(false)}>
                Use image carousel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-md border bg-background">
              {imageLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading media...
                </div>
              )}
              {imageError ? (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-destructive">
                  Media failed to load.
                </div>
              ) : (
                <img
                  src={activeImage}
                  alt={`${productName} media`}
                  className="h-full w-full object-cover"
                  onLoad={() => {
                    setImageLoading(false)
                    setImageError(false)
                  }}
                  onError={() => {
                    setImageLoading(false)
                    setImageError(true)
                  }}
                />
              )}
            </div>

            <div className="flex gap-2">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  className={`h-12 w-12 overflow-hidden rounded border ${
                    index === activeImageIndex ? "border-primary" : "border-border"
                  }`}
                  onClick={() => {
                    setImageLoading(true)
                    setImageError(false)
                    setActiveImageIndex(index)
                  }}
                >
                  <img src={image} alt={`${productName} thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            {modelUrl && (
              <Button size="sm" variant="outline" onClick={() => setShow3dFallback(true)}>
                Open 3D fallback
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
