import { createTaxCalculation, listEffectiveTaxRates, type TaxLineItemInput } from "@/lib/repositories/tax"

export interface TaxAddress {
  country?: string | null
  state?: string | null
  city?: string | null
  postalCode?: string | null
}

export interface TaxComputation {
  countryCode: string
  stateCode: string | null
  taxableAmount: number
  totalTaxAmount: number
  totalAmount: number
  lineItems: TaxLineItemInput[]
  jurisdictionDetails: Record<string, unknown>
}

const US_DEFAULT_STATE_RATES: Record<string, number> = {
  CA: 7.25,
  NY: 4,
  TX: 6.25,
  WA: 6.5,
  FL: 6,
}

function normalizeCountry(country?: string | null) {
  return (country || "").trim().toUpperCase()
}

function normalizeState(state?: string | null) {
  const value = (state || "").trim().toUpperCase()
  return value || null
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function computeFallbackTax(taxableAmount: number, countryCode: string, stateCode: string | null): TaxComputation {
  if (countryCode === "US") {
    const rate = stateCode && US_DEFAULT_STATE_RATES[stateCode] ? US_DEFAULT_STATE_RATES[stateCode] : 5
    const taxAmount = round2((taxableAmount * rate) / 100)
    return {
      countryCode,
      stateCode,
      taxableAmount,
      totalTaxAmount: taxAmount,
      totalAmount: round2(taxableAmount + taxAmount),
      jurisdictionDetails: { model: "US_SALES_TAX", defaulted: true, stateCode },
      lineItems: [
        {
          jurisdictionLevel: stateCode ? "state" : "country",
          jurisdictionCode: stateCode ?? "US",
          taxType: "sales_tax",
          taxName: `US Sales Tax${stateCode ? ` (${stateCode})` : ""}`,
          ratePercent: rate,
          taxableAmount,
          taxAmount,
          metadata: { source: "fallback" },
        },
      ],
    }
  }

  if (countryCode === "IN") {
    const gstRate = 18
    const taxAmount = round2((taxableAmount * gstRate) / 100)
    if (stateCode) {
      const halfRate = gstRate / 2
      const halfTax = round2(taxAmount / 2)
      return {
        countryCode,
        stateCode,
        taxableAmount,
        totalTaxAmount: taxAmount,
        totalAmount: round2(taxableAmount + taxAmount),
        jurisdictionDetails: { model: "IN_GST", intraState: true, stateCode },
        lineItems: [
          {
            jurisdictionLevel: "state",
            jurisdictionCode: stateCode,
            taxType: "cgst",
            taxName: "CGST",
            ratePercent: halfRate,
            taxableAmount,
            taxAmount: halfTax,
            metadata: { source: "fallback" },
          },
          {
            jurisdictionLevel: "state",
            jurisdictionCode: stateCode,
            taxType: "sgst",
            taxName: "SGST",
            ratePercent: halfRate,
            taxableAmount,
            taxAmount: round2(taxAmount - halfTax),
            metadata: { source: "fallback" },
          },
        ],
      }
    }

    return {
      countryCode,
      stateCode,
      taxableAmount,
      totalTaxAmount: taxAmount,
      totalAmount: round2(taxableAmount + taxAmount),
      jurisdictionDetails: { model: "IN_GST", intraState: false },
      lineItems: [
        {
          jurisdictionLevel: "country",
          jurisdictionCode: "IN",
          taxType: "igst",
          taxName: "IGST",
          ratePercent: gstRate,
          taxableAmount,
          taxAmount,
          metadata: { source: "fallback" },
        },
      ],
    }
  }

  return {
    countryCode: countryCode || "UN",
    stateCode,
    taxableAmount,
    totalTaxAmount: 0,
    totalAmount: taxableAmount,
    jurisdictionDetails: { model: "UNSUPPORTED_REGION", defaulted: true },
    lineItems: [],
  }
}

export async function computeTaxForRegion(input: { amount: number; currency: string; address?: TaxAddress }): Promise<TaxComputation> {
  const taxableAmount = round2(input.amount)
  const countryCode = normalizeCountry(input.address?.country)
  const stateCode = normalizeState(input.address?.state)

  if (!countryCode) {
    return {
      countryCode: "UN",
      stateCode: null,
      taxableAmount,
      totalTaxAmount: 0,
      totalAmount: taxableAmount,
      jurisdictionDetails: { model: "UNKNOWN" },
      lineItems: [],
    }
  }

  const configuredRates = await listEffectiveTaxRates(countryCode, stateCode)
  if (configuredRates.length > 0) {
    const lineItems = configuredRates.map<TaxLineItemInput>((rate) => {
      const taxAmount = round2((taxableAmount * Number(rate.ratePercent)) / 100)
      return {
        taxRateId: rate.id,
        jurisdictionLevel: rate.stateCode ? "state" : "country",
        jurisdictionCode: rate.stateCode ?? rate.countryCode,
        taxType: rate.taxType,
        taxName: rate.name,
        ratePercent: Number(rate.ratePercent),
        taxableAmount,
        taxAmount,
        metadata: { source: "configured" },
      }
    })
    const totalTaxAmount = round2(lineItems.reduce((sum, item) => sum + item.taxAmount, 0))

    return {
      countryCode,
      stateCode,
      taxableAmount,
      totalTaxAmount,
      totalAmount: round2(taxableAmount + totalTaxAmount),
      jurisdictionDetails: {
        model: countryCode === "IN" ? "IN_GST" : countryCode === "US" ? "US_SALES_TAX" : "CONFIGURED",
        source: "tax_rates",
        city: input.address?.city ?? null,
        postalCode: input.address?.postalCode ?? null,
      },
      lineItems,
    }
  }

  return computeFallbackTax(taxableAmount, countryCode, stateCode)
}

export async function persistTaxComputation(input: {
  sourceType: "checkout" | "subscription" | "invoice" | "transaction"
  sourceId: string
  userId?: number
  currency: string
  computation: TaxComputation
}) {
  return createTaxCalculation({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    userId: input.userId,
    countryCode: input.computation.countryCode,
    stateCode: input.computation.stateCode,
    currency: input.currency,
    taxableAmount: input.computation.taxableAmount,
    totalTaxAmount: input.computation.totalTaxAmount,
    totalAmount: input.computation.totalAmount,
    jurisdictionDetails: input.computation.jurisdictionDetails,
    lineItems: input.computation.lineItems,
  })
}
