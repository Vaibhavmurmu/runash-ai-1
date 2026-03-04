"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Leaf, ShoppingCart, Clock, Zap } from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { useCart } from "@/contexts/cart-context"
import type { GroceryProduct } from "@/types/grocery-store"
import { ProductMediaModal } from "@/components/grocery/product-media-modal"

interface FeaturedProductsProps {
  products: GroceryProduct[]
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  const { currency, formatPrice, convertPrice } = useCurrency()
  const { addToCart } = useCart()
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null)

  const handleAddToCart = (product: GroceryProduct) => {
    const cartProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: currency === "INR" && product.priceINR ? product.priceINR : convertPrice(product.price),
      category: product.category,
      isOrganic: product.isOrganic,
      sustainabilityScore: product.sustainabilityScore,
      image: product.images[0],
      inStock: product.inStock,
      certifications: product.certifications,
      carbonFootprint: product.carbonFootprint,
      isLocal: product.farmInfo ? product.farmInfo.distance < 100 : false,
    }

    addToCart(cartProduct, 1)
  }

  const getDisplayPrice = (product: GroceryProduct) => {
    if (currency === "INR" && product.priceINR) {
      return formatPrice(product.priceINR)
    }
    return formatPrice(convertPrice(product.price))
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Featured Organic Products</h2>
        <p className="text-muted-foreground">Hand-picked premium organic products from trusted local farms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card
            key={product.id}
            className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-lg"
          >
            <div className="relative">
              <button
                type="button"
                className="w-full"
                onClick={() => setSelectedProduct(product)}
                aria-label={`View ${product.name} media in fullscreen`}
              >
                <img
                  src={product.images[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </button>

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.isOrganic && (
                  <Badge className="bg-green-600 text-white">
                    <Leaf className="h-3 w-3 mr-1" />
                    Certified Organic
                  </Badge>
                )}
                {product.isOnSale && (
                  <Badge className="bg-red-600 text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    Limited Offer
                  </Badge>
                )}
                {product.isFreshProduce && (
                  <Badge className="bg-blue-600 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    Farm Fresh
                  </Badge>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="ml-1">{product.averageRating}</span>
                  </div>
                  <span>•</span>
                  <span>{product.totalReviews} reviews</span>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

                {product.farmInfo && (
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                    <div className="text-sm">
                      <div className="font-medium text-green-800 dark:text-green-200">{product.farmInfo.farmName}</div>
                      <div className="text-green-600 dark:text-green-400 text-xs">
                        {product.farmInfo.location} • {product.farmInfo.distance}km away
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{getDisplayPrice(product)}</div>
                    <div className="text-xs text-muted-foreground">per {product.unit}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Eco Score</div>
                    <div className="text-lg font-bold text-green-600">{product.sustainabilityScore}/10</div>
                  </div>
                </div>

                <Button
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.inStock}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProductMediaModal
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null)
        }}
        title={selectedProduct?.name || "Product"}
        media={(selectedProduct?.images ?? []).map((src, index) => ({
          id: `${selectedProduct?.id ?? "product"}-img-${index}`,
          type: "image" as const,
          src,
          alt: `${selectedProduct?.name || "Product"} image ${index + 1}`,
        }))}
      />
    </div>
  )
}
