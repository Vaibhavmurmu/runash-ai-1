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
  region: "IN" | "US"
  residencyPolicy: ResidencyPolicy
  residencyPolicyVersion: string
  complianceProfile: ComplianceProfile
  merchantRegion: string
  customerRegion: string
  reason: "merchant_or_customer_in_india" | "default_us_routing"
}

export interface PaymentRoutingContextMetadata {
  region: "IN" | "US"
  residencyPolicyVersion: string
  requestId: string
}

export interface PaymentRoutingAuditEvent {
  requestId: string
  routeDecision: Pick<EdgeRoutingPolicyDecision, "regionRoute" | "region" | "residencyPolicy" | "residencyPolicyVersion" | "complianceProfile" | "reason">
  metadata: Record<string, unknown>
}

const ROUTING_RESIDENCY_POLICY_VERSION = "2026-02-26.1"

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
      region: "IN",
      residencyPolicy: "IN_DATA_RESIDENCY",
      residencyPolicyVersion: ROUTING_RESIDENCY_POLICY_VERSION,
      complianceProfile: "IN_RBI_PROFILE",
      merchantRegion,
      customerRegion,
      reason: "merchant_or_customer_in_india",
    }
  }

  return {
    regionRoute: "US_EDGE",
    region: "US",
    residencyPolicy: "US_DATA_RESIDENCY",
    residencyPolicyVersion: ROUTING_RESIDENCY_POLICY_VERSION,
    complianceProfile: "US_STRIPE_PROFILE",
    merchantRegion,
    customerRegion,
    reason: "default_us_routing",
  }
}

export function createPaymentRoutingContextMetadata(input: {
  requestId?: string | null
  routeDecision: Pick<EdgeRoutingPolicyDecision, "region" | "residencyPolicyVersion">
}): PaymentRoutingContextMetadata {
  return {
    region: input.routeDecision.region,
    residencyPolicyVersion: input.routeDecision.residencyPolicyVersion,
    requestId: getPaymentRoutingRequestId(input.requestId),
  }
}

export function withRouteContextMetadata(
  metadata: Record<string, unknown>,
  routeDecision: Pick<EdgeRoutingPolicyDecision, "regionRoute" | "region" | "residencyPolicy" | "residencyPolicyVersion" | "complianceProfile">,
  contextMetadata: PaymentRoutingContextMetadata,
): Record<string, string> {
  const mergedMetadata = sanitizePaymentActivityDetails({
    ...metadata,
    region_route: routeDecision.regionRoute,
    region: routeDecision.region,
    residency_policy: routeDecision.residencyPolicy,
    residency_policy_version: routeDecision.residencyPolicyVersion,
    compliance_profile: routeDecision.complianceProfile,
    request_id: contextMetadata.requestId,
  })

  return Object.fromEntries(Object.entries(mergedMetadata).map(([key, value]) => [key, String(value ?? "")]))
}

export function buildComplianceSafePaymentMetadata(input: {
  requestId?: string | null
  routeDecision: Pick<EdgeRoutingPolicyDecision, "region" | "residencyPolicyVersion">
  metadata?: Record<string, unknown>
}): Record<string, string> {
  const routingContext = createPaymentRoutingContextMetadata({
    requestId: input.requestId,
    routeDecision: input.routeDecision,
  })
  const mergedMetadata = sanitizePaymentActivityDetails({
    ...(input.metadata ?? {}),
    region: routingContext.region,
    residency_policy_version: routingContext.residencyPolicyVersion,
    request_id: routingContext.requestId,
  })

  return Object.fromEntries(
    Object.entries(mergedMetadata)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
      .map(([key, value]) => [key, String(value)]),
  )
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
      region: input.decision.region,
      residencyPolicy: input.decision.residencyPolicy,
      residencyPolicyVersion: input.decision.residencyPolicyVersion,
      complianceProfile: input.decision.complianceProfile,
      reason: input.decision.reason,
    },
    metadata: sanitizePaymentActivityDetails(input.metadata ?? {}),
  }
}
