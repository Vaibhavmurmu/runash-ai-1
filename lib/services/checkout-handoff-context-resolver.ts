import { createHash } from "crypto"

import type { ServerAuthSession } from "@/lib/auth/session"
import { computeTaxForRegion } from "@/lib/services/tax-service"

export type CheckoutPricingSnapshot = {
  subtotal: number
  taxAmount?: number
  feeAmount?: number
  total?: number
  currency?: string
}

export type CheckoutBillingProfile = {
  country?: string
  state?: string
  city?: string
  postalCode?: string
  currency?: string
}

export type CheckoutMerchantProfile = {
  merchantId?: string
  merchantEntityId?: string
  merchantCountry?: string
}

export type CheckoutProductSelection = {
  sku?: string
  itemName?: string
  amount?: number
  metadata?: Record<string, unknown>
}

export type CheckoutCanonicalSessionInput = {
  cartId?: string
  selectedSku?: string
  pricingSnapshot?: CheckoutPricingSnapshot
  billingProfile?: CheckoutBillingProfile
  merchantProfile?: CheckoutMerchantProfile
  productSelection?: CheckoutProductSelection
  merchant_id?: string
  product_metadata?: Record<string, unknown>
  idempotency_key?: string
}

export type CheckoutResolvedContext = {
  merchantId: string
  merchantEntityId: string
  merchantCountry: string
  amount: number
  currency: "USD" | "INR"
  itemName: string
  sku: string
  productMetadata: Record<string, unknown>
  taxBreakdown: {
    amount: number
    label: string
    line_items: Array<Record<string, unknown>>
  }
  feeBreakdown: {
    amount: number
    label: string
    source: string
  }
  billingCountry: string
  idempotencyKey: string
  contextVersion: "v2"
}

const FALLBACK_ITEM_NAME = "RunAshChat Instant Checkout Item"

function cents(input: number) {
  if (!Number.isFinite(input) || input <= 0) return 0
  return Math.round(input)
}


function normalizeCurrency(input?: string): "USD" | "INR" {
  return input?.toUpperCase() === "INR" ? "INR" : "USD"
}

function resolveBillingCountry(input?: CheckoutBillingProfile, merchantCountry?: string) {
  const profileCountry = input?.country?.trim().toUpperCase()
  if (profileCountry) return profileCountry
  return merchantCountry?.trim().toUpperCase() || "US"
}

function resolveSku(input: CheckoutCanonicalSessionInput, fallbackDigest: string) {
  const selectedSku = input.selectedSku?.trim()
  if (selectedSku) return selectedSku

  const productSku = input.productSelection?.sku?.trim()
  if (productSku) return productSku

  const legacySku = typeof input.product_metadata?.sku === "string" ? input.product_metadata.sku.trim() : ""
  if (legacySku) return legacySku

  const cartId = input.cartId?.trim()
  if (cartId) return `cart-${cartId}`

  return `runashchat-${fallbackDigest.slice(0, 12)}`
}

function resolveAmountCents(input: CheckoutCanonicalSessionInput) {
  if (typeof input.pricingSnapshot?.total === "number") {
    return cents(input.pricingSnapshot.total)
  }

  if (typeof input.productSelection?.amount === "number") {
    return cents(input.productSelection.amount)
  }

  if (typeof input.pricingSnapshot?.subtotal === "number") {
    return cents(input.pricingSnapshot.subtotal)
  }

  return 1000
}

function resolveMerchantContext(input: CheckoutCanonicalSessionInput, session: ServerAuthSession | null) {
  const organizationId = session?.user?.ssoOrganization
  const fallbackMerchantId = session?.user?.id ? `runash-merchant-${session.user.id}` : "runash-default-merchant"
  const merchantId =
    input.merchantProfile?.merchantId?.trim() ||
    input.merchant_id?.trim() ||
    fallbackMerchantId

  const merchantEntityId =
    input.merchantProfile?.merchantEntityId?.trim() ||
    (organizationId != null ? `org-${organizationId}` : `${merchantId}-entity`)

  const merchantCountry =
    input.merchantProfile?.merchantCountry?.trim().toUpperCase() ||
    "US"

  return { merchantId, merchantEntityId, merchantCountry }
}

function buildFallbackTaxBreakdown(country: string, amount: number) {
  const normalized = country.trim().toUpperCase()
  const rate = normalized === "IN" ? 18 : normalized === "US" ? 5 : 0
  const taxAmount = Math.round((amount * rate) / 100)

  return {
    amount: taxAmount,
    label: normalized === "IN" ? "GST" : "Sales Tax",
    line_items:
      rate > 0
        ? [
            {
              type: normalized === "IN" ? "igst" : "sales_tax",
              label: normalized === "IN" ? "IGST" : "Sales Tax",
              jurisdiction: normalized || "UN",
              rate_percent: rate,
              amount: taxAmount,
            },
          ]
        : [],
  }
}

export async function resolveCheckoutHandoffContext(input: {
  sessionId: string
  message: string
  canonical?: CheckoutCanonicalSessionInput
  authSession?: ServerAuthSession | null
  resolveFeeBreakdown?: (ctx: {
    amount: number
    currency: "USD" | "INR"
    merchantId: string
    sku: string
  }) => Promise<{ amount: number; label: string; source?: string }>
}) {
  const canonical = input.canonical ?? {}
  const normalizedMessage = input.message.trim().toLowerCase()
  const digest = createHash("sha256").update(`${input.sessionId}:${normalizedMessage}`).digest("hex")

  const merchant = resolveMerchantContext(canonical, input.authSession ?? null)
  const sku = resolveSku(canonical, digest)
  const itemName = canonical.productSelection?.itemName?.trim() || FALLBACK_ITEM_NAME
  const currency = normalizeCurrency(canonical.billingProfile?.currency || canonical.pricingSnapshot?.currency)
  const billingCountry = resolveBillingCountry(canonical.billingProfile, merchant.merchantCountry)

  const amount = resolveAmountCents(canonical)

  const computedTax = await computeTaxForRegion({
    amount: amount / 100,
    currency,
    address: {
      country: billingCountry,
      state: canonical.billingProfile?.state,
      city: canonical.billingProfile?.city,
      postalCode: canonical.billingProfile?.postalCode,
    },
    productTaxCode: "digital_services",
  }).catch(() => null)

  const fee =
    (await input.resolveFeeBreakdown?.({
      amount,
      currency,
      merchantId: merchant.merchantId,
      sku,
    })) ?? {
      amount: Math.round(amount * 0.029),
      label: "payment_processing_fee",
      source: "payment-provider-default",
    }

  const idempotencyKey = canonical.idempotency_key?.trim() || `intent:${digest}`

  return {
    merchantId: merchant.merchantId,
    merchantEntityId: merchant.merchantEntityId,
    merchantCountry: merchant.merchantCountry,
    amount,
    currency,
    itemName,
    sku,
    productMetadata: {
      ...(canonical.product_metadata ?? {}),
      ...(canonical.productSelection?.metadata ?? {}),
      item_name: itemName,
      sku,
      tags: ["via RunAshChat", "instant_checkout", "relay_handoff_v1"],
      context_version: "v2",
      cart_id: canonical.cartId ?? null,
      selected_sku: canonical.selectedSku ?? sku,
    },
    taxBreakdown:
      computedTax != null
        ? {
            amount: Math.round(computedTax.totalTaxAmount * 100),
            label: billingCountry === "IN" ? "GST" : "Sales Tax",
            line_items: computedTax.lineItems.map((line) => ({
              type: line.taxType,
              label: line.taxName,
              jurisdiction: line.jurisdictionCode,
              rate_percent: line.ratePercent,
              amount: Math.round(line.taxAmount * 100),
            })),
          }
        : buildFallbackTaxBreakdown(billingCountry, amount),
    feeBreakdown: {
      amount: cents(fee.amount),
      label: fee.label,
      source: fee.source ?? "payment-provider",
    },
    billingCountry,
    idempotencyKey,
    contextVersion: "v2" as const,
  }
}
