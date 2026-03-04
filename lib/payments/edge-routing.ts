export type RegionRoute = "IN_EDGE" | "US_EDGE"

export type ResidencyPolicy = "IN_DATA_RESIDENCY" | "US_DATA_RESIDENCY"

export interface EdgeRoutingInput {
  merchantRegion?: string | null
  customerRegion?: string | null
}

export interface EdgeRoutingDecision {
  regionRoute: RegionRoute
  residencyPolicy: ResidencyPolicy
  merchantRegion: string
  customerRegion: string
  reason: string
}

const INDIA_REGION_CODES = new Set(["IN", "IND", "APAC_IN"])

function normalizeRegion(region?: string | null): string {
  return (region ?? "").trim().toUpperCase()
}

function isIndiaRegion(region?: string | null): boolean {
  const normalizedRegion = normalizeRegion(region)
  if (!normalizedRegion) {
    return false
  }

  if (INDIA_REGION_CODES.has(normalizedRegion)) {
    return true
  }

  return normalizedRegion.startsWith("IN-")
}

export function resolvePaymentEdgeRouting(input: EdgeRoutingInput): EdgeRoutingDecision {
  const merchantRegion = normalizeRegion(input.merchantRegion) || "US"
  const customerRegion = normalizeRegion(input.customerRegion) || "US"

  const shouldUseIndiaRouting = isIndiaRegion(merchantRegion) || isIndiaRegion(customerRegion)

  if (shouldUseIndiaRouting) {
    return {
      regionRoute: "IN_EDGE",
      residencyPolicy: "IN_DATA_RESIDENCY",
      merchantRegion,
      customerRegion,
      reason: "merchant_or_customer_in_india",
    }
  }

  return {
    regionRoute: "US_EDGE",
    residencyPolicy: "US_DATA_RESIDENCY",
    merchantRegion,
    customerRegion,
    reason: "default_us_routing",
  }
}
