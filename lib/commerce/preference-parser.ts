const currencyHints: Record<string, string> = {
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  inr: "INR",
  rupee: "INR",
  rupees: "INR",
  eur: "EUR",
  euro: "EUR",
  euros: "EUR",
  gbp: "GBP",
  pound: "GBP",
  pounds: "GBP",
}

const sustainabilityKeywords = ["eco", "eco-friendly", "organic", "sustainable", "recycled", "cruelty-free", "vegan", "low-carbon"]
const categoryPrefixes = ["category", "for", "in", "within"]
const knownCategories = ["skincare", "wellness", "nutrition", "beauty", "electronics", "fashion", "home", "grocery"]

export type ParsedBuyerPreferences = {
  budget_ceiling: number | null
  currency: string
  category: string | null
  sustainability_requirements: string[]
  brand_priorities: string[]
  spec_priorities: string[]
}

function extractCurrency(message: string): string {
  const normalized = message.toLowerCase()
  const symbolHints: Array<[RegExp, string]> = [
    [/\$/i, "USD"],
    [/₹/i, "INR"],
    [/€/i, "EUR"],
    [/£/i, "GBP"],
  ]

  for (const [pattern, currency] of symbolHints) {
    if (pattern.test(normalized)) return currency
  }

  for (const [hint, currency] of Object.entries(currencyHints)) {
    if (new RegExp(`\\b${hint}\\b`, "i").test(normalized)) {
      return currency
    }
  }

  return "USD"
}

function extractBudget(message: string): number | null {
  const normalized = message.toLowerCase()
  const budgetPatterns = [
    /(?:under|below|<=?|less than|max(?:imum)?|budget(?: of)?|upto|up to)\s*(?:[$₹€£])?\s*(\d+(?:\.\d+)?)/i,
    /(?:[$₹€£])\s*(\d+(?:\.\d+)?)/i,
  ]

  for (const pattern of budgetPatterns) {
    const match = normalized.match(pattern)
    if (!match) continue

    const value = Number(match[1])
    if (Number.isFinite(value) && value > 0) return value
  }

  return null
}

function extractCategory(message: string): string | null {
  const normalized = message.toLowerCase()

  for (const category of knownCategories) {
    if (new RegExp(`\\b${category}\\b`, "i").test(normalized)) {
      return category
    }
  }

  for (const prefix of categoryPrefixes) {
    const match = normalized.match(new RegExp(`${prefix}\\s+([a-z-]{3,20})`, "i"))
    if (match?.[1]) return match[1].trim()
  }

  return null
}

function extractBrandPriorities(message: string): string[] {
  const match = message.match(/(?:brand|brands?)\s*(?:like|:)?\s*([a-z0-9,\s&-]+)/i)
  if (!match?.[1]) return []

  return match[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function extractSpecPriorities(message: string): string[] {
  const cues = ["need", "needs", "must have", "with", "spec", "specs", "feature", "features"]
  const normalized = message.toLowerCase()

  for (const cue of cues) {
    const match = normalized.match(new RegExp(`${cue}\\s+([a-z0-9,\\s-]{3,80})`, "i"))
    if (!match?.[1]) continue

    return match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  }

  return []
}

export function parseBuyerPreferences(message: string): ParsedBuyerPreferences {
  const lower = message.toLowerCase()

  return {
    budget_ceiling: extractBudget(message),
    currency: extractCurrency(message),
    category: extractCategory(message),
    sustainability_requirements: sustainabilityKeywords.filter((keyword) => lower.includes(keyword)),
    brand_priorities: extractBrandPriorities(message),
    spec_priorities: extractSpecPriorities(message),
  }
}
