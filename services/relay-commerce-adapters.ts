import { randomUUID } from "crypto"

import { z } from "zod"

import { products as localProducts } from "@/lib/data/store"
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
  price: number
  inventory_count: number
  in_stock: boolean
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
    // fallback maintained for non-db environments
  }

  return localProducts.map((product) => ({
    id: product.id,
    user_id: product.user_id,
    name: product.name,
    description: product.description,
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
