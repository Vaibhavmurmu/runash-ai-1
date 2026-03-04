"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Play, ShoppingCart, Wifi } from "lucide-react"

export type LiveMediaCard = {
  id: string
  title: string
  sellerName: string
  image: string
  fallbackImage?: string
  isLive: boolean
  mediaType: "image" | "video"
  priceLabel: string
  originalPriceLabel?: string
  discountLabel?: string
  inStock?: boolean
  onOpen: () => void
  onPrimaryAction?: () => void
}

interface LiveMediaRailProps {
  cards: LiveMediaCard[]
  loading?: boolean
}

export function LiveMediaRail({ cards, loading = false }: LiveMediaRailProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  const hasCards = useMemo(() => cards.length > 0, [cards])

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 md:max-h-[30rem] md:flex-col md:overflow-y-auto md:overflow-x-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-52 w-56 flex-shrink-0 animate-pulse rounded-xl bg-muted md:h-40 md:w-full" />
        ))}
      </div>
    )
  }

  if (!hasCards) {
    return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No live media available right now.</p>
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 md:max-h-[30rem] md:flex-col md:overflow-y-auto md:overflow-x-hidden">
      {cards.map((card) => {
        const showFallback = failedImages[card.id] && card.fallbackImage
        const imageSrc = showFallback ? card.fallbackImage : card.image

        return (
          <article key={card.id} className="group relative h-56 w-64 flex-shrink-0 snap-start overflow-hidden rounded-xl border bg-card shadow-sm md:h-44 md:w-full">
            <button
              type="button"
              onClick={card.onOpen}
              className="relative h-full w-full text-left"
              aria-label={`Open ${card.title} media`}
            >
              <img
                src={imageSrc || "/placeholder.svg"}
                alt={card.title}
                loading="lazy"
                onError={() => setFailedImages((prev) => ({ ...prev, [card.id]: true }))}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1">
                <Badge className="bg-black/70 text-white">{card.sellerName}</Badge>
                {card.isLive && (
                  <Badge className="bg-red-600 text-white">
                    <Wifi className="mr-1 h-3 w-3" />
                    Live
                  </Badge>
                )}
                {card.discountLabel && <Badge className="bg-emerald-600 text-white">{card.discountLabel}</Badge>}
              </div>

              <div className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white">
                {card.mediaType === "video" ? <Play className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="line-clamp-1 text-sm font-semibold">{card.title}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-emerald-300">{card.priceLabel}</span>
                  {card.originalPriceLabel && <span className="text-xs text-gray-200 line-through">{card.originalPriceLabel}</span>}
                </div>
              </div>
            </button>

            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button type="button" size="sm" variant="secondary" className="h-8 rounded-full" onClick={card.onOpen}>
                <Eye className="mr-1 h-3.5 w-3.5" /> View
              </Button>
              {card.onPrimaryAction && (
                <Button type="button" size="sm" className="h-8 rounded-full bg-green-600 hover:bg-green-700" onClick={card.onPrimaryAction} disabled={card.inStock === false}>
                  <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                  {card.inStock === false ? "Sold out" : "Add"}
                </Button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
