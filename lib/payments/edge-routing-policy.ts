import { randomUUID } from "crypto"

import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"

export type PaymentRegionRoute = "IN_EDGE" | "US_EDGE"

export type ResidencyPolicy = "IN_DATA_RESIDENCY" | "US_DATA_RESIDENCY"

export type ComplianceProfile = "IN_RBI_PROFILE" | "US_STRIPE_PROFILE"

export interface EdgeRoutingPolicyInput {
  merchantRegion?: string | null
  customerRegion?: string | null
}

export interface EdgeRoutingPolicyDecision {
  regionRoute: PaymentRegionRoute
  residencyPolicy: ResidencyPolicy
  complianceProfile: ComplianceProfile
  merchantRegion: string
  customerRegion: string
  reason: "merchant_or_customer_in_india" | "default_us_routing"
}

export interface PaymentRoutingAuditEvent {
  requestId: string
  routeDecision: Pick<EdgeRoutingPolicyDecision, "regionRoute" | "residencyPolicy" | "complianceProfile" | "reason">
  metadata: Record<string, unknown>
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

export function getPaymentRoutingRequestId(requestId?: string | null): string {
  const normalizedRequestId = (requestId ?? "").trim()
  return normalizedRequestId || randomUUID()
}

export function resolveEdgeRoutingPolicy(input: EdgeRoutingPolicyInput): EdgeRoutingPolicyDecision {
  const merchantRegion = normalizeRegion(input.merchantRegion) || "US"
  const customerRegion = normalizeRegion(input.customerRegion) || "US"

  const useIndiaRouting = isIndiaRegion(merchantRegion) || isIndiaRegion(customerRegion)

  if (useIndiaRouting) {
    return {
      regionRoute: "IN_EDGE",
      residencyPolicy: "IN_DATA_RESIDENCY",
      complianceProfile: "IN_RBI_PROFILE",
      merchantRegion,
      customerRegion,
      reason: "merchant_or_customer_in_india",
    }
  }

  return {
    regionRoute: "US_EDGE",
    residencyPolicy: "US_DATA_RESIDENCY",
    complianceProfile: "US_STRIPE_PROFILE",
    merchantRegion,
    customerRegion,
    reason: "default_us_routing",
  }
}

export function withRouteContextMetadata(
  metadata: Record<string, unknown>,
  routeDecision: Pick<EdgeRoutingPolicyDecision, "regionRoute" | "residencyPolicy" | "complianceProfile">,
): Record<string, string> {
  const mergedMetadata = sanitizePaymentActivityDetails({
    ...metadata,
    region_route: routeDecision.regionRoute,
    residency_policy: routeDecision.residencyPolicy,
    compliance_profile: routeDecision.complianceProfile,
  })

  return Object.fromEntries(Object.entries(mergedMetadata).map(([key, value]) => [key, String(value ?? "")]))
}

export function createPaymentRoutingAuditEvent(input: {
  requestId?: string | null
  decision: EdgeRoutingPolicyDecision
  metadata?: Record<string, unknown>
}): PaymentRoutingAuditEvent {
  return {
    requestId: getPaymentRoutingRequestId(input.requestId),
    routeDecision: {
      regionRoute: input.decision.regionRoute,
      residencyPolicy: input.decision.residencyPolicy,
      complianceProfile: input.decision.complianceProfile,
      reason: input.decision.reason,
    },
    metadata: sanitizePaymentActivityDetails(input.metadata ?? {}),
  }
}
