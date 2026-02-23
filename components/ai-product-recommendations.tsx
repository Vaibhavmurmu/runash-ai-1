"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, ShoppingCart, Sparkles, Info, Clock, Eye, Leaf, Award, MapPin, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"
import { useAnalytics } from "@/components/analytics-provider"
import { getOrganicProducts, formatPrice, type Product } from "@/lib/products"

interface RecommendationReason {
  type: "viewing_history" | "similar_products" | "popular" | "trending" | "complementary" | "health_benefits"
  description: string
  confidence: number // 0-100
  source?: string
  healthBenefit?: string
}

interface ProductRecommendation extends Product {
  reason: RecommendationReason
}

export default function AIProductRecommendations() {
  const { toast } = useToast()
  const { addItem } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { trackEvent } = useAnalytics()
  const [isLoading, setIsLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([])
  const [recommendationTypes, setRecommendationTypes] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")

  useEffect(() => {
    const loadRecommendations = async () => {
      setIsLoading(true)

      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const allProducts = getOrganicProducts()

      // Enhanced recommendation reason types for organic products
      const reasonTypes = [
        {
          type: "viewing_history" as const,
          descriptions: [
            "Based on your interest in organic turmeric products",
            "Because you viewed organic spices recently",
            "Matches your preference for Kerala organic products",
            "Similar to your recent organic food searches",
          ],
          healthBenefits: [
            "Rich in antioxidants for immunity",
            "Natural anti-inflammatory properties",
            "Supports digestive health",
            "Boosts metabolism naturally",
          ],
        },
        {
          type: "health_benefits" as const,
          descriptions: [
            "Perfect for your wellness journey",
            "Supports your healthy lifestyle goals",
            "Recommended for natural immunity boost",
            "Ideal for your organic diet plan",
          ],
          healthBenefits: [
            "Enhances natural immunity",
            "Supports heart health",
            "Rich in essential nutrients",
            "Promotes natural detox",
          ],
        },
        {
          type: "similar_products" as const,
          descriptions: [
            "Complements your organic spice collection",
            "Goes well with your recent organic purchases",
            "Perfect addition to your healthy pantry",
            "Customers with similar tastes loved this",
          ],
          healthBenefits: [
            "Complete nutrition profile",
            "Synergistic health benefits",
            "Enhanced bioavailability",
            "Traditional wellness combination",
          ],
        },
        {
          type: "popular" as const,
          descriptions: [
            "Most loved organic product this month",
            "Top-rated by health-conscious customers",
            "Bestseller in organic category",
            "Highly recommended by nutritionists",
          ],
          healthBenefits: [
            "Proven health benefits",
            "Trusted by thousands",
            "Scientifically validated",
            "Traditional remedy backed by science",
          ],
        },
        {
          type: "trending" as const,
          descriptions: [
            "Trending among health enthusiasts",
            "Popular in your city this week",
            "Featured in recent wellness streams",
            "Rising star in organic foods",
          ],
          healthBenefits: [
            "Modern superfood benefits",
            "Trending for good reasons",
            "Emerging health research",
            "Next-gen wellness ingredient",
          ],
        },
        {
          type: "complementary" as const,
          descriptions: [
            "Perfect with your organic honey purchase",
            "Completes your morning wellness routine",
            "Enhances your organic tea experience",
            "Ideal for your healthy cooking needs",
          ],
          healthBenefits: [
            "Synergistic health effects",
            "Enhanced absorption together",
            "Complete wellness solution",
            "Balanced nutritional profile",
          ],
        },
      ]

      // Generate AI-powered recommendations
      const generateRecommendations = () => {
        const typeWeights = isAuthenticated
          ? [0.25, 0.25, 0.2, 0.1, 0.1, 0.1] // Authenticated users get more personalized recommendations
          : [0.1, 0.2, 0.1, 0.3, 0.2, 0.1] // Anonymous users see more popular and trending items

        return allProducts.map((product) => {
          const randomValue = Math.random()
          let cumulativeWeight = 0
          let selectedTypeIndex = 0

          for (let i = 0; i < typeWeights.length; i++) {
            cumulativeWeight += typeWeights[i]
            if (randomValue <= cumulativeWeight) {
              selectedTypeIndex = i
              break
            }
          }

          const reasonType = reasonTypes[selectedTypeIndex]
          const description = reasonType.descriptions[Math.floor(Math.random() * reasonType.descriptions.length)]
          const healthBenefit = reasonType.healthBenefits[Math.floor(Math.random() * reasonType.healthBenefits.length)]

          return {
            ...product,
            reason: {
              type: reasonType.type,
              description,
              confidence: Math.floor(Math.random() * 20) + 80, // 80-99% confidence for organic products
              source: isAuthenticated ? "Your wellness profile" : undefined,
              healthBenefit,
            },
          }
        })
      }

      const allRecommendations = generateRecommendations()
      const shuffled = allRecommendations.sort(() => 0.5 - Math.random())
      const selectedRecommendations = shuffled.slice(0, 8)

      const types = Array.from(new Set(selectedRecommendations.map((rec) => rec.reason.type)))

      setRecommendations(selectedRecommendations)
      setRecommendationTypes(types)
      setIsLoading(false)

      trackEvent("ai_organic_recommendation_generated", {
        count: selectedRecommendations.length,
        types: types,
        isAuthenticated,
      })
    }

    loadRecommendations()
  }, [isAuthenticated, trackEvent])

  const handleAddToCart = (product: ProductRecommendation) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images[0],
    })

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })

    trackEvent("ai_organic_recommendation_click", {
      productId: product.id,
      productName: product.name,
      recommendationType: product.reason.type,
      confidence: product.reason.confidence,
    })
  }

  const filteredRecommendations =
    activeTab === "all" ? recommendations : recommendations.filter((rec) => rec.reason.type === activeTab)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-square w-full animate-pulse bg-green-100 dark:bg-green-900/20"></div>
              <CardContent className="p-4">
                <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-green-100 dark:bg-green-900/20"></div>
                <div className="mb-2 h-6 w-1/2 animate-pulse rounded bg-green-100 dark:bg-green-900/20"></div>
                <div className="h-4 w-1/3 animate-pulse rounded bg-green-100 dark:bg-green-900/20"></div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <div className="h-10 w-full animate-pulse rounded bg-green-100 dark:bg-green-900/20"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-green-600" />
            <Leaf className="h-3 w-3 text-green-500 absolute -top-1 -right-1" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI-Powered Organic Recommendations</h2>
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Zap className="mr-1 h-4 w-4 text-green-500" />
          {isAuthenticated
            ? "Personalized for your wellness journey"
            : "Sign in for personalized organic recommendations"}
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-green-50 dark:bg-green-900/20">
          <TabsTrigger value="all" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            All
          </TabsTrigger>
          {recommendationTypes.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              {type === "viewing_history" && "Based on History"}
              {type === "health_benefits" && "Health Benefits"}
              {type === "similar_products" && "Similar Items"}
              {type === "popular" && "Popular"}
              {type === "trending" && "Trending"}
              {type === "complementary" && "Complementary"}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {filteredRecommendations.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-green-200 p-8 text-center">
              <Leaf className="mb-2 h-10 w-10 text-green-400" />
              <h3 className="text-lg font-medium">No organic recommendations available</h3>
              <p className="text-sm text-muted-foreground">
                We don't have any {activeTab !== "all" ? activeTab.replace("_", " ") + " " : ""}recommendations at the
                moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredRecommendations.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-green-100 dark:border-green-900"
                >
                  <div className="relative">
                    <Link href={`/products/${product.id}`}>
                      <div className="aspect-square w-full bg-gradient-to-br from-green-50 to-green-100 p-6 dark:from-green-900/20 dark:to-green-800/20">
                        <Image
                          src={product.images[0] || "/placeholder.svg"}
                          alt={product.name}
                          width={200}
                          height={200}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>

                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      <Badge className="bg-green-600 hover:bg-green-700 text-white">
                        <Leaf className="h-3 w-3 mr-1" />
                        100% Organic
                      </Badge>
                      {product.discount > 0 && (
                        <Badge className="bg-orange-500 hover:bg-orange-600">{product.discount}% OFF</Badge>
                      )}
                      <Badge className="flex items-center gap-1 bg-purple-600 text-white">
                        <Sparkles className="h-3 w-3" />
                        {product.reason.confidence}% Match
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>

                    {product.certifications && (
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="outline" className="bg-white/90 text-green-700 border-green-200">
                          <Award className="h-3 w-3 mr-1" />
                          Certified
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                        {product.reason.type === "viewing_history" && <Eye className="h-3 w-3" />}
                        {product.reason.type === "health_benefits" && <Zap className="h-3 w-3" />}
                        {product.reason.type === "trending" && <Sparkles className="h-3 w-3" />}
                        {product.reason.type === "popular" && <ShoppingCart className="h-3 w-3" />}
                        {product.reason.type === "similar_products" && <Info className="h-3 w-3" />}
                        {product.reason.type === "complementary" && <Clock className="h-3 w-3" />}
                        {product.reason.description}
                      </div>
                      {product.reason.healthBenefit && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                          💚 {product.reason.healthBenefit}
                        </div>
                      )}
                    </div>

                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>

                    {product.origin && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-3 w-3" />
                        <span>From {product.origin}</span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice > product.price && (
                        <span className="text-sm line-through text-gray-500">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-sm">
                      <div className="flex">
                        {Array(5)
                          .fill(0)
                          .map((_, i) => (
                            <span
                              key={i}
                              className={i < Math.floor(product.rating) ? "text-yellow-500" : "text-gray-300"}
                            >
                              ★
                            </span>
                          ))}
                      </div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {product.rating} ({product.reviewCount})
                      </span>
                    </div>

                    {product.features && (
                      <div className="flex flex-wrap gap-1">
                        {product.features.slice(0, 2).map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0 space-y-2">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                    </Button>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Stock: {product.stock} left</span>
                      <span>Free delivery above ₹500</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
