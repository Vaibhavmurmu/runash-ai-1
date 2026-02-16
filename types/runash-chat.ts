export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  status?: "queued" | "streaming" | "tool-running" | "completed" | "failed"
  type?: "text" | "product" | "recipe" | "tip" | "automation"
  metadata?: {
    products?: Product[]
    recipes?: Recipe[]
    tips?: SustainabilityTip[]
    automationSuggestions?: AutomationSuggestion[]
    searchResults?: SearchResult[]
    linkQuickPay?: LinkQuickPayPreview
  }
}

export interface LinkQuickPayPreview {
  itemName: string
  amountMinor: number
  currency: "USD" | "INR"
  eligibleForLink: boolean
  last4: string
  tags: string[]
  taxPreview?: number
  status?: string
  subtotal?: number
  taxAmount?: number
  totalAmount?: number
  taxLabel?: "GST" | "VAT" | "Sales Tax"
  taxRatePercent?: number
  blockedReason?: string
  checkoutId?: string
  nextAction?: "open_link_checkout" | "collect_valid_checkout_fields" | "retry_or_manual_review"
  confirmationPayload?: {
    merchant_id: string
    amount: number
    currency: "USD" | "INR"
    product_metadata: {
      item_name: string
      sku: string
      tags: string[]
    }
    country?: string
    region?: string
  }
}

export interface SearchResult {
  id: string
  title: string
  snippet: string
  url: string
  source: "exa" | "mcp" | "fallback"
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  isOrganic: boolean
  sustainabilityScore: number
  image: string
  arModelUrl?: string
  imageHd?: string
  imageThumb?: string
  imageAlt?: string
  inStock: boolean
  certifications: string[]
  nutritionalInfo?: NutritionalInfo
  supplier?: string
  carbonFootprint?: number
}

export interface Recipe {
  id: string
  name: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  prepTime: number
  cookTime: number
  servings: number
  ingredients: Ingredient[]
  instructions: string[]
  image: string
  imageHd?: string
  imageThumb?: string
  imageAlt?: string
  tags: string[]
  sustainabilityScore: number
  nutritionalInfo: NutritionalInfo
}

export interface Ingredient {
  id: string
  name: string
  amount: string
  unit: string
  isOrganic: boolean
  alternatives?: string[]
}

export interface SustainabilityTip {
  id: string
  title: string
  description: string
  category: "energy" | "waste" | "water" | "food" | "transport" | "shopping"
  impact: "low" | "medium" | "high"
  difficulty: "easy" | "medium" | "hard"
  estimatedSavings?: number
}

export interface AutomationSuggestion {
  id: string
  title: string
  description: string
  category: "inventory" | "pricing" | "marketing" | "customer-service" | "analytics"
  complexity: "simple" | "moderate" | "advanced"
  estimatedROI: number
  implementationTime: string
  tools: string[]
}

export interface NutritionalInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
}

export type ProductCategory =
  | "fruits-vegetables"
  | "grains-cereals"
  | "dairy-alternatives"
  | "meat-alternatives"
  | "pantry-staples"
  | "beverages"
  | "snacks"
  | "personal-care"
  | "household"
  | "supplements"

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  context: {
    preferences: UserPreferences
    currentCart: Product[]
    recentSearches: string[]
  }
}

export interface UserPreferences {
  dietaryRestrictions: string[]
  sustainabilityPriority: "low" | "medium" | "high"
  budgetRange: [number, number]
  preferredCategories: ProductCategory[]
  cookingSkillLevel: "beginner" | "intermediate" | "advanced"
  businessType?: "retail" | "restaurant" | "farm" | "distributor"
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  action: () => void
  category: "product" | "recipe" | "tip" | "automation" | "search"
}
