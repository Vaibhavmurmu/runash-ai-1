import { randomUUID } from "crypto"

import { z } from "zod"

import { parseBuyerPreferences } from "@/lib/commerce/preference-parser"
import { estimateTaxPreview } from "@/lib/payments/tax-preview"
import { listProducts } from "@/lib/repositories/products"

const catalogLookupInputSchema = z.object({
  query: z.string().trim().default(""),
  tenant_id: z.string().trim().optional(),
  merchant_id: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(25).default(8),
})

const inventoryHealthInputSchema = z.object({
  tenant_id: z.string().trim().optional(),
  merchant_id: z.string().trim().optional(),
  warehouse: z.string().trim().optional(),
  inventory_location_id: z.string().trim().optional(),
  low_stock_threshold: z.coerce.number().int().positive().max(200).default(20),
})


const buyerProductSearchInputSchema = z.object({
  query: z.string().trim().default(""),
  tenant_id: z.string().trim().optional(),
  merchant_id: z.string().trim().optional(),
  user_currency: z.string().trim().min(3).max(3).default("USD"),
  max_results: z.coerce.number().int().positive().max(20).default(6),
})

const fallbackFxRates: Record<string, number> = {
  "USD-USD": 1,
  "USD-INR": 83,
  "USD-EUR": 0.92,
  "USD-GBP": 0.79,
}

const productSustainabilitySignals: Record<string, string[]> = {
  skincare: ["organic", "cruelty-free"],
  wellness: ["sustainable", "low-carbon"],
  nutrition: ["vegan", "recycled"],
}



const sellerOptimizationInputSchema = z.object({
  merchant_id: z.string().trim().optional(),
  tenant_id: z.string().trim().optional(),
  low_stock_threshold: z.coerce.number().int().positive().max(200).default(15),
  target_margin_percent: z.coerce.number().min(1).max(90).default(22),
  bundle_size: z.coerce.number().int().min(2).max(6).default(2),
})

const brokerMatchInputSchema = z.object({
  tenant_id: z.string().trim().optional(),
  demand_query: z.string().trim().default(""),
  buyer_budget_minor: z.coerce.number().int().positive().optional(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  max_results: z.coerce.number().int().positive().max(10).default(3),
})

export type SellerOptimizationResult = {
  merchant_id: string
  generated_at: string
  pricing_recommendations: Array<{
    sku: string
    product_id: string
    current_price: number
    recommended_price: number
    rationale: string[]
  }>
  inventory_risk_insights: Array<{
    sku: string
    product_id: string
    inventory_count: number
    risk_level: "low" | "medium" | "high"
    action: string
  }>
  bundle_promotions: Array<{
    bundle_id: string
    skus: string[]
    suggested_discount_percent: number
    expected_conversion_lift: number
  }>
}

export type BrokerDealMatchResult = {
  demand_query: string
  currency: string
  generated_at: string
  recommendations: Array<{
    recommendation_id: string
    sku: string
    product_id: string
    seller_id: string
    offer_price_minor: number
    confidence_score: number
    negotiation_state: "draft" | "pending_counter" | "broker_recommended"
    settlement_recommendation: {
      suggested_price_minor: number
      rationale: string[]
    }
  }>
}

const checkoutPreviewInputSchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        quantity: z.coerce.number().int().positive().default(1),
        unit_amount: z.coerce.number().positive().optional(),
      }),
    )
    .default([]),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  country: z.string().trim().min(2).max(3).default("US"),
  region: z.string().trim().max(30).optional(),
  line_item_metadata: z
    .object({
      taxCode: z.string().trim().optional(),
      category: z.string().trim().optional(),
      tags: z.array(z.string().trim()).optional(),
    })
    .partial()
    .optional(),
})


export type CatalogLookupResult = {
  query: string
  source: "products_repository"
  catalog_id: string
  items: Array<{
    product_id: string
    sku: string
    name: string
    unit_amount: number
    currency: string
    inventory_count: number
    in_stock: boolean
    score: number
  }>
  generated_at: string
}

export type InventoryHealthResult = {
  inventory_location_id: string
  inventory_snapshot_id: string
  low_stock_skus: Array<{
    sku: string
    product_id: string
    inventory_location_id: string
    available_quantity: number
    threshold: number
  }>
  generated_at: string
}

export type CheckoutPreviewResult = {
  quote_id: string
  preview_id: string
  line_items: Array<{
    sku: string
    quantity: number
    unit_amount: number
    line_total: number
  }>
  estimated_total: number
  preview: {
    subtotal: number
    gstVatAmount: number
    totalPayable: number
    taxLabel: "GST" | "VAT" | "Sales Tax"
    taxRatePercent: number
    country: string
    region: string | null
    currency: string
    tax_line_items: Array<{
      type: "GST" | "VAT" | "SALES_TAX"
      label: string
      jurisdiction: string
      ratePercent: number
      amount: number
    }>
    previewDisplayedAt: string
  }
  warnings: string[]
}

type ProductProjection = {
  id: string
  user_id?: string
  name: string
  description?: string | null
  category?: string | null
  price: number
  inventory_count: number
  in_stock: boolean
}

export type BuyerProductSearchResult = {
  query: string
  preferences: ReturnType<typeof parseBuyerPreferences>
  user_currency: string
  source: "products_repository"
  catalog_id: string
  results: Array<{
    product_id: string
    sku: string
    name: string
    category: string | null
    price: {
      amount: number
      currency: string
      normalized_amount: number
      normalized_currency: string
    }
    inventory: {
      in_stock: boolean
      inventory_count: number
    }
    sustainability: {
      attributes: string[]
      score: number
    }
    ranking_score: number
    reasons: {
      matched_budget: boolean
      sustainability_score: number
      tradeoffs: string[]
    }
  }>
  generated_at: string
}

function normalizeSku(product: ProductProjection) {
  return `SKU-${product.id.slice(0, 12).toUpperCase()}`
}

async function loadProducts(tenantOrMerchantId?: string): Promise<ProductProjection[]> {
  try {
    const records = await listProducts(tenantOrMerchantId)
    if (records.length > 0) {
      return records
    }
  } catch {
    // fallback handled below in explicit dev mode
  }

  const allowDemoSeedStore = process.env.NODE_ENV !== "production" && process.env.RUNASH_ENABLE_DEMO_SEED_STORE === "true"
  if (!allowDemoSeedStore) {
    return []
  }

  const { products: localProducts } = await import("@/lib/data/store")
  return localProducts.map((product) => ({
    id: product.id,
    user_id: product.user_id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: Number(product.price),
    inventory_count: Number(product.inventory_count),
    in_stock: Boolean(product.in_stock),
  }))
}

export async function queryCatalogAdapter(args: unknown): Promise<CatalogLookupResult> {
  const input = catalogLookupInputSchema.parse(args ?? {})
  const query = input.query.toLowerCase()
  const scopedIdentity = input.tenant_id ?? input.merchant_id
  const products = await loadProducts(scopedIdentity)

  const items = products
    .map((product) => {
      const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase()
      const score = query.length === 0 ? 0.8 : haystack.includes(query) ? 0.98 : 0.0
      return {
        product_id: product.id,
        sku: normalizeSku(product),
        name: product.name,
        unit_amount: Number(product.price),
        currency: "USD",
        inventory_count: Number(product.inventory_count),
        in_stock: product.in_stock,
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)

  return {
    query: input.query,
    source: "products_repository",
    catalog_id: scopedIdentity ? `catalog:${scopedIdentity}` : "catalog:global",
    items,
    generated_at: new Date().toISOString(),
  }
}

export async function getInventoryHealthAdapter(args: unknown): Promise<InventoryHealthResult> {
  const input = inventoryHealthInputSchema.parse(args ?? {})
  const scopedIdentity = input.tenant_id ?? input.merchant_id
  const locationId = input.inventory_location_id ?? `warehouse:${input.warehouse ?? "default"}`
  const products = await loadProducts(scopedIdentity)

  const lowStockItems = products
    .filter((product) => Number(product.inventory_count) <= input.low_stock_threshold)
    .map((product) => ({
      sku: normalizeSku(product),
      product_id: product.id,
      inventory_location_id: locationId,
      available_quantity: Number(product.inventory_count),
      threshold: input.low_stock_threshold,
    }))

  return {
    inventory_location_id: locationId,
    inventory_snapshot_id: `inv_${randomUUID().replace(/-/g, "")}`,
    low_stock_skus: lowStockItems,
    generated_at: new Date().toISOString(),
  }
}

export async function getCheckoutPreviewAdapter(args: unknown): Promise<CheckoutPreviewResult> {
  const input = checkoutPreviewInputSchema.parse(args ?? {})

  const subtotalFromItems = input.items.reduce((total, item) => {
    const lineAmount = Number(item.unit_amount ?? 0) * Number(item.quantity)
    return total + (Number.isFinite(lineAmount) ? lineAmount : 0)
  }, 0)
  const subtotal = subtotalFromItems > 0 ? subtotalFromItems : Number(input.amount ?? 0)

  const taxPreview = estimateTaxPreview({
    amount: subtotal,
    amountUnit: "major",
    currency: input.currency,
    country: input.country,
    region: input.region,
    lineItemMetadata: input.line_item_metadata,
  })

  const previewId = `preview_${randomUUID().replace(/-/g, "")}`

  return {
    quote_id: previewId,
    preview_id: previewId,
    line_items: input.items.map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
      unit_amount: Number(item.unit_amount ?? 0),
      line_total: Number(item.unit_amount ?? 0) * item.quantity,
    })),
    estimated_total: taxPreview.total,
    preview: {
      subtotal: taxPreview.subtotal,
      gstVatAmount: taxPreview.taxAmount,
      totalPayable: taxPreview.total,
      taxLabel: taxPreview.taxLabel,
      taxRatePercent: taxPreview.taxRatePercent,
      country: taxPreview.country,
      region: taxPreview.region,
      currency: taxPreview.currency,
      tax_line_items: taxPreview.taxLineItems,
      previewDisplayedAt: new Date().toISOString(),
    },
    warnings: input.items.length > 8 ? ["Large cart may require split shipment"] : [],
  }
}


function getFxRate(fromCurrency: string, toCurrency: string) {
  const key = `${fromCurrency.toUpperCase()}-${toCurrency.toUpperCase()}`
  return fallbackFxRates[key] ?? 1
}

function scoreSustainability(product: ProductProjection, requirements: string[]) {
  const categoryKey = (product.category ?? "").toLowerCase()
  const attributes = productSustainabilitySignals[categoryKey] ?? []
  if (requirements.length === 0) {
    return { attributes, score: attributes.length > 0 ? 0.7 : 0.5 }
  }

  const matched = requirements.filter((item) => attributes.includes(item))
  const score = Math.min(1, matched.length / requirements.length)
  return { attributes, score }
}

export async function buyerProductSearchAdapter(args: unknown): Promise<BuyerProductSearchResult> {
  const input = buyerProductSearchInputSchema.parse(args ?? {})
  const scopedIdentity = input.tenant_id ?? input.merchant_id
  const products = await loadProducts(scopedIdentity)
  const preferences = parseBuyerPreferences(input.query)
  const normalizedCurrency = (preferences.currency || input.user_currency).toUpperCase()

  const ranked = products
    .map((product) => {
      const fxRate = getFxRate("USD", normalizedCurrency)
      const normalizedAmount = Number((product.price * fxRate).toFixed(2))
      const sustainability = scoreSustainability(product, preferences.sustainability_requirements)
      const queryWords = input.query.toLowerCase().split(/\s+/).filter(Boolean)
      const haystack = `${product.name} ${product.description ?? ""} ${product.category ?? ""}`.toLowerCase()
      const textScore =
        queryWords.length === 0
          ? 0.4
          : queryWords.filter((word) => haystack.includes(word)).length / queryWords.length
      const categoryScore = preferences.category
        ? (product.category ?? "").toLowerCase().includes(preferences.category.toLowerCase())
          ? 1
          : 0
        : 0.4
      const stockScore = product.in_stock ? 1 : 0
      const matchedBudget = preferences.budget_ceiling ? normalizedAmount <= preferences.budget_ceiling : true
      const budgetScore = matchedBudget ? 1 : Math.max(0, 1 - (normalizedAmount - (preferences.budget_ceiling ?? normalizedAmount)) / normalizedAmount)
      const rankingScore = Number((textScore * 0.25 + categoryScore * 0.2 + sustainability.score * 0.2 + stockScore * 0.2 + budgetScore * 0.15).toFixed(4))
      const tradeoffs: string[] = []
      if (!matchedBudget) tradeoffs.push("price_above_budget")
      if (!product.in_stock) tradeoffs.push("currently_out_of_stock")
      if (preferences.sustainability_requirements.length > 0 && sustainability.score < 0.6) tradeoffs.push("partial_sustainability_match")

      return {
        product_id: product.id,
        sku: normalizeSku(product),
        name: product.name,
        category: product.category ?? null,
        price: {
          amount: Number(product.price),
          currency: "USD",
          normalized_amount: normalizedAmount,
          normalized_currency: normalizedCurrency,
        },
        inventory: {
          in_stock: product.in_stock,
          inventory_count: Number(product.inventory_count),
        },
        sustainability,
        ranking_score: rankingScore,
        reasons: {
          matched_budget: matchedBudget,
          sustainability_score: sustainability.score,
          tradeoffs: tradeoffs.length > 0 ? tradeoffs : ["no_major_tradeoffs"],
        },
      }
    })
    .sort((a, b) => b.ranking_score - a.ranking_score)
    .slice(0, input.max_results)

  return {
    query: input.query,
    preferences,
    user_currency: normalizedCurrency,
    source: "products_repository",
    catalog_id: scopedIdentity ? `catalog:${scopedIdentity}` : "catalog:global",
    results: ranked,
    generated_at: new Date().toISOString(),
  }
}


export async function sellerOptimizationAdapter(args: unknown): Promise<SellerOptimizationResult> {
  const input = sellerOptimizationInputSchema.parse(args ?? {})
  const scopedIdentity = input.tenant_id ?? input.merchant_id
  const products = await loadProducts(scopedIdentity)
  const merchantId = input.merchant_id ?? scopedIdentity ?? "runash-default-merchant"

  const pricingRecommendations = products.slice(0, 8).map((product) => {
    const inventoryPressure = product.inventory_count <= input.low_stock_threshold ? 0.04 : 0.01
    const recommendedPrice = Number((product.price * (1 + inventoryPressure)).toFixed(2))
    return {
      sku: normalizeSku(product),
      product_id: product.id,
      current_price: Number(product.price),
      recommended_price: recommendedPrice,
      rationale:
        inventoryPressure > 0.02
          ? ["low_inventory_margin_protection", "reduce_discount_depth"]
          : ["healthy_inventory_enable_promo", "maintain_target_margin"],
    }
  })

  const inventoryRiskInsights = products.slice(0, 12).map((product) => {
    const riskLevel: "low" | "medium" | "high" =
      product.inventory_count <= Math.max(3, Math.round(input.low_stock_threshold / 3))
        ? "high"
        : product.inventory_count <= input.low_stock_threshold
          ? "medium"
          : "low"

    return {
      sku: normalizeSku(product),
      product_id: product.id,
      inventory_count: Number(product.inventory_count),
      risk_level: riskLevel,
      action:
        riskLevel === "high"
          ? "trigger_reorder_and_reduce_promotions"
          : riskLevel === "medium"
            ? "monitor_velocity_and_prepare_restock"
            : "eligible_for_bundle_campaign",
    }
  })

  const bundlePromotions = products
    .filter((product) => product.in_stock)
    .slice(0, input.bundle_size * 2)
    .reduce<Array<{ bundle_id: string; skus: string[]; suggested_discount_percent: number; expected_conversion_lift: number }>>((acc, _, idx, arr) => {
      if (idx % input.bundle_size !== 0) return acc
      const bundle = arr.slice(idx, idx + input.bundle_size)
      if (bundle.length < input.bundle_size) return acc
      const skus = bundle.map((entry) => normalizeSku(entry))
      acc.push({
        bundle_id: `bundle_${idx + 1}`,
        skus,
        suggested_discount_percent: 6,
        expected_conversion_lift: 0.14,
      })
      return acc
    }, [])

  return {
    merchant_id: merchantId,
    generated_at: new Date().toISOString(),
    pricing_recommendations: pricingRecommendations,
    inventory_risk_insights: inventoryRiskInsights,
    bundle_promotions: bundlePromotions,
  }
}

export async function brokerDealMatchAdapter(args: unknown): Promise<BrokerDealMatchResult> {
  const input = brokerMatchInputSchema.parse(args ?? {})
  const scopedIdentity = input.tenant_id
  const products = await loadProducts(scopedIdentity)
  const preferences = parseBuyerPreferences(input.demand_query)
  const fxRate = getFxRate("USD", input.currency)

  const recommendations = products
    .map((product, index) => {
      const offerPriceMinor = Math.max(1, Math.round(product.price * fxRate * 100))
      const budgetMinor = typeof input.buyer_budget_minor === "number" ? input.buyer_budget_minor : null
      const withinBudget = budgetMinor == null ? true : offerPriceMinor <= budgetMinor
      const confidence = withinBudget ? 0.86 : 0.62
      const suggested = withinBudget ? offerPriceMinor : Math.max(1, Math.round((budgetMinor ?? offerPriceMinor) * 0.98))

      return {
        recommendation_id: `broker_rec_${index + 1}`,
        sku: normalizeSku(product),
        product_id: product.id,
        seller_id: product.user_id ?? "seller-default",
        offer_price_minor: offerPriceMinor,
        confidence_score: confidence,
        negotiation_state: withinBudget ? ("broker_recommended" as const) : ("pending_counter" as const),
        settlement_recommendation: {
          suggested_price_minor: suggested,
          rationale: [
            preferences.category ? `category_focus:${preferences.category}` : "category_general",
            withinBudget ? "budget_aligned" : "requires_counter_offer",
          ],
        },
      }
    })
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, input.max_results)

  return {
    demand_query: input.demand_query,
    currency: input.currency.toUpperCase(),
    generated_at: new Date().toISOString(),
    recommendations,
  }
}
