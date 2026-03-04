"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Star, Leaf, ShoppingCart, Heart, Info, ScanSearch, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import type { Product, ProductMediaAsset } from "@/types/runash-chat"
import { useCart } from "@/contexts/cart-context"

interface ProductCardProps {
  product: Product
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function getDistance(touches: TouchList) {
  if (touches.length < 2) return 0
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [arOpen, setArOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [arSupportMessage, setArSupportMessage] = useState("Checking AR support...")
  const [isArSupported, setIsArSupported] = useState(false)

  const panStartRef = useRef({ x: 0, y: 0 })
  const panOriginRef = useRef({ x: 0, y: 0 })
  const pinchDistanceRef = useRef(0)
  const pinchZoomRef = useRef(1)

  const mediaAssets = useMemo(() => {
    const assets: ProductMediaAsset[] = []
    if (product.image) {
      assets.push({
        id: `${product.id}-primary`,
        type: "image",
        url: product.imageHd ?? product.image,
        thumbnailUrl: product.imageThumb ?? product.image,
        hdUrl: product.imageHd,
        alt: product.imageAlt ?? product.name,
        title: `${product.name} image`,
      })
    }

    for (const asset of product.mediaAssets ?? []) {
      if (!asset?.url || asset.type === "model") continue
      if (assets.some((existing) => existing.url === asset.url)) continue
      assets.push(asset)
    }

    return assets
  }, [product])

  const activeMedia = mediaAssets[activeMediaIndex]

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleZoomChange = (delta: number) => {
    setZoom((current) => clampZoom(current + delta))
  }

  const goToMedia = (index: number) => {
    if (mediaAssets.length < 1) return
    const nextIndex = (index + mediaAssets.length) % mediaAssets.length
    setActiveMediaIndex(nextIndex)
    resetView()
  }

  const handleAddToCart = () => {
    addToCart(product, 1)
    console.log("Added to cart:", product.name)
  }

  useEffect(() => {
    if (!product.arModelUrl || typeof navigator === "undefined") {
      setIsArSupported(false)
      setArSupportMessage("No AR model attached yet. Add product.arModelUrl to enable 3D preview.")
      return
    }

    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    const hasWebXR = "xr" in navigator

    if (hasWebXR || isIOS || isAndroid) {
      setIsArSupported(true)
      setArSupportMessage("AR preview is available. Use the controls below to launch or inspect this model.")
      return
    }

    setIsArSupported(false)
    setArSupportMessage("This device/browser may not support immersive AR. Open model in a new tab or switch to a mobile AR-capable browser.")
  }, [product.arModelUrl])

  useEffect(() => {
    if (!lightboxOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxOpen(false)
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        handleZoomChange(ZOOM_STEP)
      } else if (event.key === "-") {
        event.preventDefault()
        handleZoomChange(-ZOOM_STEP)
      } else if (event.key === "ArrowRight" && mediaAssets.length > 1) {
        event.preventDefault()
        goToMedia(activeMediaIndex + 1)
      } else if (event.key === "ArrowLeft" && mediaAssets.length > 1) {
        event.preventDefault()
        goToMedia(activeMediaIndex - 1)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeMediaIndex, lightboxOpen, mediaAssets.length])

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setActiveMediaIndex(0)
            resetView()
            setLightboxOpen(true)
          }}
          className="w-full"
          aria-label={`Open ${product.name} media viewer`}
        >
          <img src={product.image || "/placeholder.svg"} alt={product.name} className="h-32 w-full object-cover" />
        </button>
        {product.isOrganic && (
          <Badge className="absolute left-2 top-2 bg-green-600 text-white">
            <Leaf className="mr-1 h-3 w-3" />
            Organic
          </Badge>
        )}
        <div className="absolute right-2 top-2 flex items-center space-x-1 rounded-full bg-white/90 px-2 py-1">
          <Star className="h-3 w-3 fill-current text-yellow-500" />
          <span className="text-xs font-medium">{product.sustainabilityScore}/10</span>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-medium">{product.name}</h4>
          <span className="text-lg font-bold text-green-600">${product.price}</span>
        </div>
        <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{product.description}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="mb-3 flex flex-wrap gap-1">
          {product.certifications.map((cert) => (
            <Badge key={cert} variant="outline" className="text-xs">
              {cert}
            </Badge>
          ))}
        </div>

        {product.carbonFootprint && (
          <div className="mb-3 flex items-center text-xs text-gray-600 dark:text-gray-400">
            <Leaf className="mr-1 h-3 w-3 text-green-500" />
            Carbon footprint: {product.carbonFootprint}kg CO₂
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 text-white hover:from-orange-700 hover:to-yellow-600"
          >
            <ShoppingCart className="mr-1 h-3 w-3" />
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>

          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" aria-label="View product details">
                <Info className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{product.name}</DialogTitle>
                <DialogDescription>Detailed product view with certifications and sustainability details.</DialogDescription>
              </DialogHeader>
              <img src={product.imageHd ?? product.image ?? "/placeholder.svg"} alt={product.name} className="h-56 w-full rounded-md object-cover" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{product.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="font-medium">Category</div>
                  <div className="text-gray-500">{product.category}</div>
                </div>
                <div>
                  <div className="font-medium">Supplier</div>
                  <div className="text-gray-500">{product.supplier ?? "RunAsh Marketplace"}</div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={arOpen} onOpenChange={setArOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Open AR product view">
                <ScanSearch className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AR Product View</DialogTitle>
                <DialogDescription>Preview the product in augmented reality on supported devices.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-sm">
                <p className="text-gray-700 dark:text-gray-200">{arSupportMessage}</p>
                <div className="flex flex-wrap gap-2">
                  {product.arModelUrl && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={product.arModelUrl} target="_blank" rel="noreferrer noopener">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Open model in new tab
                      </a>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  <div>
                    <span className="font-medium">Model URL: </span>
                    <span className="break-all">{product.arModelUrl ?? "Not available"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Device support: </span>
                    <span>{isArSupported ? "Likely supported" : "Not detected"}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-md border bg-muted">
                {isArSupported && product.arModelUrl ? (
                  <iframe
                    title={`${product.name} AR preview`}
                    src={product.arModelUrl}
                    className="h-72 w-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center p-4 text-center text-sm text-gray-600 dark:text-gray-300">
                    AR inline preview unavailable on this setup. Use the new-tab option above for fallback access.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm">
            <Heart className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={lightboxOpen}
        onOpenChange={(isOpen) => {
          setLightboxOpen(isOpen)
          if (!isOpen) resetView()
        }}
      >
        <DialogContent className="h-[92vh] max-w-6xl p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle>{product.name} media viewer</DialogTitle>
            <DialogDescription>
              Zoom with +/- keys or mouse wheel, drag to pan, and use arrow keys for navigation when multiple media items are available.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => handleZoomChange(ZOOM_STEP)} aria-label="Zoom in">
              <ZoomIn className="mr-1 h-3 w-3" />
              Zoom in
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleZoomChange(-ZOOM_STEP)} aria-label="Zoom out">
              <ZoomOut className="mr-1 h-3 w-3" />
              Zoom out
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetView} aria-label="Reset zoom and pan">
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
            <Badge variant="outline">{Math.round(zoom * 100)}%</Badge>
            {mediaAssets.length > 1 && (
              <Badge variant="outline">
                {activeMediaIndex + 1}/{mediaAssets.length}
              </Badge>
            )}
          </div>

          <div
            className="relative flex h-[60vh] items-center justify-center overflow-hidden rounded-md border bg-black/90"
            onWheel={(event) => {
              event.preventDefault()
              handleZoomChange(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
            }}
            onMouseDown={(event) => {
              if (zoom <= 1) return
              setIsPanning(true)
              panStartRef.current = { x: event.clientX, y: event.clientY }
              panOriginRef.current = pan
            }}
            onMouseMove={(event) => {
              if (!isPanning || zoom <= 1) return
              const dx = event.clientX - panStartRef.current.x
              const dy = event.clientY - panStartRef.current.y
              setPan({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy })
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
            onTouchStart={(event) => {
              if (event.touches.length === 1 && zoom > 1) {
                const touch = event.touches[0]
                panStartRef.current = { x: touch.clientX, y: touch.clientY }
                panOriginRef.current = pan
              }

              if (event.touches.length === 2) {
                pinchDistanceRef.current = getDistance(event.touches)
                pinchZoomRef.current = zoom
              }
            }}
            onTouchMove={(event) => {
              if (event.touches.length === 2) {
                const currentDistance = getDistance(event.touches)
                if (!pinchDistanceRef.current) return
                const ratio = currentDistance / pinchDistanceRef.current
                setZoom(clampZoom(pinchZoomRef.current * ratio))
                return
              }

              if (event.touches.length === 1 && zoom > 1) {
                const touch = event.touches[0]
                const dx = touch.clientX - panStartRef.current.x
                const dy = touch.clientY - panStartRef.current.y
                setPan({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy })
              }
            }}
            role="presentation"
          >
            {activeMedia && (
              <img
                src={activeMedia.hdUrl ?? activeMedia.url ?? "/placeholder.svg"}
                alt={activeMedia.alt ?? product.imageAlt ?? product.name}
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center",
                  transition: isPanning ? "none" : "transform 120ms ease-out",
                  cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
                }}
              />
            )}

            {mediaAssets.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  aria-label="Previous media"
                  onClick={() => goToMedia(activeMediaIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label="Next media"
                  onClick={() => goToMedia(activeMediaIndex + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {mediaAssets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pt-1">
              {mediaAssets.map((asset, index) => (
                <button
                  key={asset.id ?? `${asset.url}-${index}`}
                  type="button"
                  onClick={() => goToMedia(index)}
                  className={`overflow-hidden rounded border ${index === activeMediaIndex ? "border-orange-500" : "border-transparent"}`}
                  aria-label={`View media item ${index + 1}`}
                >
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt={asset.alt ?? `${product.name} media ${index + 1}`}
                    className="h-14 w-14 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
