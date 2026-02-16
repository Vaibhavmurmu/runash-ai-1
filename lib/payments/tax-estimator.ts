export type TaxEstimatorInput = {
  country?: string | null
  region?: string | null
  lineItemMetadata?: {
    taxCode?: string | null
    category?: string | null
    tags?: string[]
  }
  amount: number
  currency: string
}

export type TaxPreview = {
  subtotal: number
  gstVatAmount: number
  totalPayable: number
  taxLabel: "GST" | "VAT"
  taxRatePercent: number
  country: string
  region: string | null
  currency: string
}

const GST_COUNTRIES = new Set(["IN", "SG", "AU", "NZ"])

const DEFAULT_TAX_RATE_BY_COUNTRY: Record<string, number> = {
  IN: 18,
  SG: 9,
  AU: 10,
  NZ: 15,
  GB: 20,
  DE: 19,
  FR: 20,
  IT: 22,
  ES: 21,
  US: 0,
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function normalizeCode(value?: string | null) {
  return (value ?? "").trim().toUpperCase()
}

function resolveTaxRate(input: { country: string; lineItemMetadata?: TaxEstimatorInput["lineItemMetadata"] }) {
  const baseRate = DEFAULT_TAX_RATE_BY_COUNTRY[input.country] ?? 0
  const metadata = input.lineItemMetadata

  if (!metadata) {
    return baseRate
  }

  const loweredTaxCode = (metadata.taxCode ?? "").trim().toLowerCase()
  if (loweredTaxCode === "zero_rated" || loweredTaxCode === "export") {
    return 0
  }

  if ((metadata.tags ?? []).some((tag) => tag.toLowerCase() === "reduced_tax")) {
    return Math.max(baseRate - 5, 0)
  }

  return baseRate
}

export function estimateTaxPreview(input: TaxEstimatorInput): TaxPreview {
  const country = normalizeCode(input.country) || "US"
  const region = normalizeCode(input.region) || null
  const subtotal = roundCurrency(input.amount)
  const taxRatePercent = resolveTaxRate({
    country,
    lineItemMetadata: input.lineItemMetadata,
  })
  const gstVatAmount = roundCurrency((subtotal * taxRatePercent) / 100)
  const totalPayable = roundCurrency(subtotal + gstVatAmount)

  return {
    subtotal,
    gstVatAmount,
    totalPayable,
    taxLabel: GST_COUNTRIES.has(country) ? "GST" : "VAT",
    taxRatePercent,
    country,
    region,
    currency: input.currency,
  }
}
