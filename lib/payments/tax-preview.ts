export type TaxMode = "india_gst" | "vat" | "sales_tax"

export type TaxPreviewInput = {
  country?: string | null
  region?: string | null
  amount: number
  currency: string
  mode?: TaxMode
  lineItemMetadata?: {
    taxCode?: string | null
    category?: string | null
    tags?: string[]
  }
}

export type TaxLineItem = {
  type: "GST" | "VAT" | "SALES_TAX"
  label: string
  jurisdiction: string
  ratePercent: number
  amount: number
}

export type TaxPreviewResult = {
  subtotal: number
  taxAmount: number
  total: number
  taxLabel: "GST" | "VAT" | "Sales Tax"
  taxRatePercent: number
  country: string
  region: string | null
  currency: string
  mode: TaxMode
  taxLineItems: TaxLineItem[]
}

const VAT_COUNTRIES = new Set(["GB", "DE", "FR", "IT", "ES"])
const GST_COUNTRIES = new Set(["IN", "SG", "AU", "NZ"])

const DEFAULT_RATE_BY_COUNTRY: Record<string, number> = {
  IN: 18,
  SG: 9,
  AU: 10,
  NZ: 15,
  GB: 20,
  DE: 19,
  FR: 20,
  IT: 22,
  ES: 21,
}

const US_STATE_SALES_TAX: Record<string, number> = {
  CA: 7.25,
  NY: 4,
  TX: 6.25,
  WA: 6.5,
  FL: 6,
  IL: 6.25,
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function normalizeCode(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function resolveMode(input: { mode?: TaxMode; country: string; currency: string }) {
  if (input.mode) return input.mode
  if (input.country === "IN" || input.currency.toUpperCase() === "INR") return "india_gst" satisfies TaxMode
  if (input.country === "US") return "sales_tax" satisfies TaxMode
  if (VAT_COUNTRIES.has(input.country)) return "vat" satisfies TaxMode
  if (GST_COUNTRIES.has(input.country)) return "india_gst" satisfies TaxMode
  return "vat" satisfies TaxMode
}

function resolveTaxRate(input: {
  mode: TaxMode
  country: string
  region: string | null
  lineItemMetadata?: TaxPreviewInput["lineItemMetadata"]
}) {
  if (input.mode === "sales_tax") {
    return input.region ? (US_STATE_SALES_TAX[input.region] ?? 0) : 0
  }

  const baseRate = DEFAULT_RATE_BY_COUNTRY[input.country] ?? 0
  const metadata = input.lineItemMetadata
  if (!metadata) return baseRate

  const loweredTaxCode = (metadata.taxCode ?? "").trim().toLowerCase()
  if (loweredTaxCode === "zero_rated" || loweredTaxCode === "export") {
    return 0
  }

  if ((metadata.tags ?? []).some((tag) => tag.toLowerCase() === "reduced_tax")) {
    return Math.max(baseRate - 5, 0)
  }

  return baseRate
}

export function estimateTaxPreview(input: TaxPreviewInput): TaxPreviewResult {
  const country = normalizeCode(input.country) || "US"
  const region = normalizeCode(input.region) || null
  const mode = resolveMode({ mode: input.mode, country, currency: input.currency })
  const subtotal = roundCurrency(input.amount)
  const taxRatePercent = resolveTaxRate({
    mode,
    country,
    region,
    lineItemMetadata: input.lineItemMetadata,
  })
  const taxAmount = roundCurrency((subtotal * taxRatePercent) / 100)
  const total = roundCurrency(subtotal + taxAmount)

  const taxType = mode === "india_gst" ? "GST" : mode === "sales_tax" ? "SALES_TAX" : "VAT"
  const taxLabel = mode === "india_gst" ? "GST" : mode === "sales_tax" ? "Sales Tax" : "VAT"

  return {
    subtotal,
    taxAmount,
    total,
    taxLabel,
    taxRatePercent,
    country,
    region,
    currency: input.currency,
    mode,
    taxLineItems: [
      {
        type: taxType,
        label: taxLabel,
        jurisdiction: region ? `${country}-${region}` : country,
        ratePercent: taxRatePercent,
        amount: taxAmount,
      },
    ],
  }
}
