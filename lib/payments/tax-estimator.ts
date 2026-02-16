import { estimateTaxPreview as estimateModernTaxPreview, type TaxLineItem } from "@/lib/payments/tax-preview"

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
  taxLineItems: TaxLineItem[]
}

export function estimateTaxPreview(input: TaxEstimatorInput): TaxPreview {
  const preview = estimateModernTaxPreview(input)

  return {
    subtotal: preview.subtotal,
    gstVatAmount: preview.taxAmount,
    totalPayable: preview.total,
    taxLabel: preview.taxLabel === "GST" ? "GST" : "VAT",
    taxRatePercent: preview.taxRatePercent,
    country: preview.country,
    region: preview.region,
    currency: preview.currency,
    taxLineItems: preview.taxLineItems,
  }
}
