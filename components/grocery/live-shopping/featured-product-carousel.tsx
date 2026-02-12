"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ShoppingCart, Heart, Star, Clock, Zap, ExternalLink } from "lucide-react"
import { useCartSafe } from "@/hooks/use-cart-safe"
import { useCurrency } from "@/contexts/currency-context"

type CatalogProduct = {
  id: string
  name: string
  description: string
  price: number
  salePrice?: number
  averageRating: number
  inStock: boolean
  stockQuantity: number
  tags: string[]
  images: string[]
}

interface FeaturedProductCarouselProps {
  streamId: string
  featuredProductIds?: string[]
}

export default function FeaturedProductCarousel({ streamId, featuredProductIds = [] }: FeaturedProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(600)
  const { addItem } = useCartSafe()
  const { formatPrice, convertPrice } = useCurrency()

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true)
      setProductsError(null)

      try {
        const response = await fetch("/api/grocery/products?limit=24", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Failed to load featured products")
        }

        const payload = await response.json()
        const allProducts = (payload.products ?? []) as CatalogProduct[]
        const featuredSet = new Set(featuredProductIds)

        const selected = featuredSet.size
          ? allProducts.filter((product) => featuredSet.has(product.id))
          : allProducts.slice(0, 8)

        setProducts(selected)
        setCurrentIndex(0)
      } catch {
        setProductsError("Could not load featured products right now.")
      } finally {
        setLoadingProducts(false)
      }
    }

    void fetchProducts()
  }, [featuredProductIds, streamId])

  useEffect(() => {
    if (products.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [products])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const currentProduct = useMemo(() => products[currentIndex], [currentIndex, products])

  const handleAddToCart = (product: CatalogProduct) => {
    const itemPrice = product.salePrice ?? product.price

    addItem({
      id: product.id,
      name: product.name,
      price: itemPrice,
      image: product.images?.[0],
      quantity: 1,
    })

    void fetch("/api/grocery/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getDiscount = (product: CatalogProduct) => {
    if (!product.salePrice || product.salePrice >= product.price) return 0
    return Math.round(((product.price - product.salePrice) / product.price) * 100)
  }

  if (loadingProducts) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!currentProduct) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{productsError}</div>
  }

  const nextProduct = () => setCurrentIndex((prev) => (prev + 1) % products.length)
  const prevProduct = () => setCurrentIndex((prev) => (prev - 1 + products.length) % products.length)
  const currentPrice = currentProduct.salePrice ?? currentProduct.price
  const discount = getDiscount(currentProduct)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 text-white p-3 rounded-lg">
        <Zap className="h-5 w-5" />
        <span className="font-medium">Flash Sale Ends In:</span>
        <div className="bg-white/20 px-2 py-1 rounded font-mono font-bold">{formatTime(timeLeft)}</div>
      </div>

      <div className="relative">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <img src={currentProduct.images?.[0] || "/placeholder.svg"} alt={currentProduct.name} className="w-full h-full object-cover" />

                <div className="absolute top-3 left-3 flex flex-col space-y-2">
                  <Badge className="bg-purple-600 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                  {discount > 0 && <Badge className="bg-red-600 text-white">{discount}% OFF</Badge>}
                </div>

                {currentProduct.stockQuantity <= 10 && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="destructive" className="animate-pulse">
                      <Clock className="h-3 w-3 mr-1" />
                      Only {currentProduct.stockQuantity} left!
                    </Badge>
                  </div>
                )}
              </div>

              <Button variant="secondary" size="sm" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full w-8 h-8 p-0 bg-white/80 hover:bg-white" onClick={prevProduct}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button variant="secondary" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full w-8 h-8 p-0 bg-white/80 hover:bg-white" onClick={nextProduct}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-lg leading-tight">{currentProduct.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentProduct.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-green-600">{formatPrice(convertPrice(currentPrice))}</span>
                {currentProduct.salePrice && <span className="text-lg text-gray-500 line-through">{formatPrice(convertPrice(currentProduct.price))}</span>}
              </div>

              <div className="flex flex-wrap gap-1">
                {currentProduct.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAddToCart(currentProduct)} disabled={!currentProduct.inStock}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {currentProduct.inStock ? "Add to Cart" : "Out of Stock"}
                </Button>

                <Button asChild variant="outline" size="sm" className="px-3">
                  <Link href={`/grocery?product=${encodeURIComponent(currentProduct.id)}#product-${currentProduct.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>

                <Button variant="outline" size="sm" className="px-3">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-2 mt-4">
          {products.map((product, index) => (
            <button key={product.id} className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-purple-600" : "bg-gray-300"}`} onClick={() => setCurrentIndex(index)} />
          ))}
        </div>
      </div>
    </div>
  )
}
