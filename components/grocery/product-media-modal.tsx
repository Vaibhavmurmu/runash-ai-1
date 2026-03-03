"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react"

export type ProductMediaItem = {
  id: string
  type: "image" | "video"
  src: string
  thumbnail?: string
  alt: string
}

interface ProductMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  media: ProductMediaItem[]
  startIndex?: number
}

export function ProductMediaModal({ open, onOpenChange, title, media, startIndex = 0 }: ProductMediaModalProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setActiveIndex(startIndex)
  }, [open, startIndex])

  useEffect(() => {
    if (!open || media.length <= 1) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault()
        setActiveIndex((prev) => (prev + 1) % media.length)
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setActiveIndex((prev) => (prev - 1 + media.length) % media.length)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, media.length])

  const currentItem = useMemo(() => media[activeIndex], [activeIndex, media])

  if (!currentItem) {
    return null
  }

  const moveTo = (nextIndex: number) => {
    const count = media.length
    if (count === 0) return
    setActiveIndex((nextIndex + count) % count)
  }

  const handleTouchEnd = (touchEndX: number) => {
    if (touchStartX === null || media.length <= 1) return
    const delta = touchStartX - touchEndX
    if (Math.abs(delta) < 40) return
    moveTo(activeIndex + (delta > 0 ? 1 : -1))
    setTouchStartX(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] rounded-none border-0 bg-black/95 p-0">
        <DialogTitle className="sr-only">{title} media preview</DialogTitle>

        <div className="absolute top-3 right-3 z-30">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-10 w-10 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label="Close media preview"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          className="relative flex h-full w-full items-center justify-center px-2 sm:px-8"
          onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
        >
          {currentItem.type === "video" ? (
            <video className="max-h-[88dvh] w-full max-w-5xl rounded-md object-contain" controls autoPlay playsInline poster={currentItem.thumbnail}>
              <source src={currentItem.src} />
              Your browser does not support video playback.
            </video>
          ) : (
            <img src={currentItem.src} alt={currentItem.alt} className="max-h-[88dvh] w-full max-w-5xl rounded-md object-contain" />
          )}

          {media.length > 1 && (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute left-2 h-10 w-10 rounded-full sm:left-4"
                onClick={() => moveTo(activeIndex - 1)}
                aria-label="View previous media"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute right-2 h-10 w-10 rounded-full sm:right-4"
                onClick={() => moveTo(activeIndex + 1)}
                aria-label="View next media"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        {media.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-30 flex w-[calc(100%-1.5rem)] -translate-x-1/2 gap-2 overflow-x-auto rounded-md bg-black/60 p-2 sm:w-auto">
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded border-2 ${index === activeIndex ? "border-white" : "border-transparent"}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Open media ${index + 1}`}
              >
                <img src={item.thumbnail || item.src} alt={item.alt} className="h-full w-full object-cover" loading="lazy" />
                {item.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Play className="h-4 w-4 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
