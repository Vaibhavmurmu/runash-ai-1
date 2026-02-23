// Types for search functionality
export interface SearchResult {
  id: string
  type: "product" | "stream" | "category" | "recording"
  title: string
  description: string
  image?: string
  price?: number
  date?: string
  count?: number
  relevanceScore?: number
  tags?: string[]
}

// Natural language processing utilities (simulated)
export function extractSearchEntities(query: string): {
  categories: string[]
  priceRange: { min?: number; max?: number }
  features: string[]
  brands: string[]
  sortBy?: string
} {
  const entities = {
    categories: [] as string[],
    priceRange: {} as { min?: number; max?: number },
    features: [] as string[],
    brands: [] as string[],
    sortBy: undefined as string | undefined,
  }

  // Extract price range
  const underMatch = query.match(/under\s+\$?(\d+)/i)
  const overMatch = query.match(/over\s+\$?(\d+)/i)
  const betweenMatch = query.match(/between\s+\$?(\d+)\s+and\s+\$?(\d+)/i)

  if (underMatch) {
    entities.priceRange.max = Number.parseInt(underMatch[1])
  }
  if (overMatch) {
    entities.priceRange.min = Number.parseInt(overMatch[1])
  }
  if (betweenMatch) {
    entities.priceRange.min = Number.parseInt(betweenMatch[1])
    entities.priceRange.max = Number.parseInt(betweenMatch[2])
  }

  // Extract categories
  const categoryKeywords = [
    { keywords: ["smart home", "home automation"], category: "Smart Home" },
    { keywords: ["audio", "sound", "headphone", "earbud", "speaker"], category: "Audio" },
    { keywords: ["wearable", "watch", "fitness tracker"], category: "Wearables" },
    { keywords: ["camera", "webcam", "video"], category: "Cameras" },
    { keywords: ["accessory", "accessories", "charger", "power bank"], category: "Accessories" },
  ]

  categoryKeywords.forEach(({ keywords, category }) => {
    if (keywords.some((keyword) => query.toLowerCase().includes(keyword))) {
      entities.categories.push(category)
    }
  })

  // Extract features
  const featureKeywords = [
    "wireless",
    "bluetooth",
    "noise cancellation",
    "waterproof",
    "portable",
    "rechargeable",
    "fast charging",
    "long battery",
    "high resolution",
    "4k",
    "voice control",
    "touch screen",
    "lightweight",
    "compact",
    "durable",
  ]

  featureKeywords.forEach((feature) => {
    if (query.toLowerCase().includes(feature)) {
      entities.features.push(feature)
    }
  })

  // Extract brands
  const brandKeywords = ["RunAsh", "AudioPro", "TechConnect", "PowerTech", "SmartLife", "FitTech"]

  brandKeywords.forEach((brand) => {
    if (query.toLowerCase().includes(brand.toLowerCase())) {
      entities.brands.push(brand)
    }
  })

  // Extract sort preference
  if (
    query.toLowerCase().includes("cheapest") ||
    query.toLowerCase().includes("lowest price") ||
    query.toLowerCase().includes("most affordable")
  ) {
    entities.sortBy = "price-asc"
  } else if (
    query.toLowerCase().includes("expensive") ||
    query.toLowerCase().includes("highest price") ||
    query.toLowerCase().includes("premium")
  ) {
    entities.sortBy = "price-desc"
  } else if (
    query.toLowerCase().includes("best rated") ||
    query.toLowerCase().includes("highest rated") ||
    query.toLowerCase().includes("top rated")
  ) {
    entities.sortBy = "rating"
  } else if (query.toLowerCase().includes("popular") || query.toLowerCase().includes("best selling")) {
    entities.sortBy = "popularity"
  } else if (query.toLowerCase().includes("newest") || query.toLowerCase().includes("latest")) {
    entities.sortBy = "newest"
  }

  return entities
}

// Generate search suggestions based on partial query
export function generateSearchSuggestions(query: string, products: any[]): string[] {
  if (!query || query.length < 2) return []

  const lowercaseQuery = query.toLowerCase()
  const suggestions: string[] = []

  // Extract product names, categories, brands, and features
  const productNames = products.map((p) => p.name.toLowerCase())
  const categories = Array.from(new Set(products.map((p) => p.category.toLowerCase())))
  const brands = Array.from(new Set(products.map((p) => p.brand.toLowerCase())))
  const features = Array.from(
    new Set(products.flatMap((p) => (p.features ? p.features.map((f: string) => f.toLowerCase()) : []))),
  )

  // Find matches
  const matchingProducts = productNames.filter((name) => name.includes(lowercaseQuery))
  const matchingCategories = categories.filter((cat) => cat.includes(lowercaseQuery))
  const matchingBrands = brands.filter((brand) => brand.includes(lowercaseQuery))
  const matchingFeatures = features.filter((feature) => feature.includes(lowercaseQuery))

  // Add direct matches
  suggestions.push(...matchingProducts.slice(0, 2))
  suggestions.push(...matchingCategories.map((c) => `${c} products`).slice(0, 2))
  suggestions.push(...matchingBrands.map((b) => `${b} products`).slice(0, 1))

  // Add feature-based suggestions
  if (matchingFeatures.length > 0) {
    suggestions.push(`products with ${matchingFeatures[0]}`)
  }

  // Add semantic suggestions based on query intent
  if (lowercaseQuery.includes("cheap") || lowercaseQuery.includes("affordable")) {
    suggestions.push("affordable tech under $50")
    suggestions.push("budget-friendly smart home devices")
  }

  if (lowercaseQuery.includes("best") || lowercaseQuery.includes("top")) {
    suggestions.push("top-rated tech products")
    suggestions.push("best wireless earbuds")
  }

  if (lowercaseQuery.includes("new") || lowercaseQuery.includes("latest")) {
    suggestions.push("newest tech releases")
    suggestions.push("latest smart home innovations")
  }

  // Remove duplicates and limit
  return Array.from(new Set(suggestions)).slice(0, 5)
}

// Calculate semantic relevance score for search results
export function calculateRelevanceScore(item: any, query: string): number {
  const lowercaseQuery = query.toLowerCase()
  let score = 0

  // Direct matches
  if (item.title.toLowerCase().includes(lowercaseQuery)) {
    score += 5
    // Exact match gets higher score
    if (item.title.toLowerCase() === lowercaseQuery) {
      score += 3
    }
  }

  if (item.description && item.description.toLowerCase().includes(lowercaseQuery)) {
    score += 3
  }

  // Tag matches
  if (item.tags) {
    const matchingTags = item.tags.filter(
      (tag: string) => tag.toLowerCase().includes(lowercaseQuery) || lowercaseQuery.includes(tag.toLowerCase()),
    )
    score += matchingTags.length * 2
  }

  // Price-related queries
  if (item.price) {
    if (
      (lowercaseQuery.includes("cheap") ||
        lowercaseQuery.includes("affordable") ||
        lowercaseQuery.includes("budget") ||
        lowercaseQuery.includes("under")) &&
      item.price < 100
    ) {
      score += 4
    }

    if (
      (lowercaseQuery.includes("premium") ||
        lowercaseQuery.includes("high-end") ||
        lowercaseQuery.includes("luxury")) &&
      item.price > 200
    ) {
      score += 4
    }
  }

  // Feature-related queries
  const featureKeywords = [
    { keywords: ["wireless", "bluetooth", "cordless"], score: 3 },
    { keywords: ["noise cancellation", "noise cancelling", "anc"], score: 3 },
    { keywords: ["waterproof", "water resistant", "splash proof"], score: 3 },
    { keywords: ["portable", "travel", "compact"], score: 3 },
    { keywords: ["smart", "intelligent", "automated"], score: 3 },
    { keywords: ["battery", "long lasting", "rechargeable"], score: 2 },
    { keywords: ["high resolution", "4k", "hd"], score: 2 },
  ]

  featureKeywords.forEach(({ keywords, score: featureScore }) => {
    if (
      keywords.some((keyword) => lowercaseQuery.includes(keyword)) &&
      item.description &&
      keywords.some((keyword) => item.description.toLowerCase().includes(keyword))
    ) {
      score += featureScore
    }
  })

  // Add some randomness to simulate complex AI ranking (within a small range)
  score += Math.random() * 0.5

  return Math.min(10, score)
}
