import { estimateTaxPreview } from "@/lib/payments/tax-preview"

export interface TaxEstimationInput {
  subtotal: number
  currency: string
  country?: string | null
  region?: string | null
}

export interface TaxEstimationBreakdown {
  subtotal: number
  gstVatAmount: number
  totalAmount: number
  taxLabel: "GST" | "VAT" | "Sales Tax"
  taxRatePercent: number
}

export function estimateCheckoutTaxBreakdown(input: TaxEstimationInput): TaxEstimationBreakdown {
  const taxPreview = estimateTaxPreview({
    amount: input.subtotal,
    amountUnit: "major",
    currency: input.currency,
    country: input.country,
    region: input.region,
  })

  return {
    subtotal: taxPreview.subtotal,
    gstVatAmount: taxPreview.taxAmount,
    totalAmount: taxPreview.total,
    taxLabel: taxPreview.taxLabel,
    taxRatePercent: taxPreview.taxRatePercent,
  }
}
