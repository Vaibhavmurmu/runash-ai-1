import { createHash } from "crypto"

import type { EdgeRoutingPolicyDecision, PaymentRoutingAuditEvent } from "@/lib/payments/edge-routing-policy"

export interface PaymentComplianceAuditEvent {
  event: "runash_pay_request"
  merchantId: string
  amountMinor: number
  currency: string
  provider: "stripe_link"
  edgeRouting: Pick<EdgeRoutingPolicyDecision, "regionRoute" | "complianceProfile" | "merchantRegion" | "customerRegion">
  validatorPassed: boolean
  routeAudit: PaymentRoutingAuditEvent
}

function fingerprintMerchant(merchantId: string): string {
  return createHash("sha256").update(merchantId).digest("hex").slice(0, 12)
}

export function logPaymentComplianceAudit(event: PaymentComplianceAuditEvent): void {
  const safeAuditRecord = {
    event: event.event,
    merchantFingerprint: fingerprintMerchant(event.merchantId),
    amountMinor: event.amountMinor,
    currency: event.currency,
    provider: event.provider,
    validatorPassed: event.validatorPassed,
    edgeRouting: event.edgeRouting,
    requestId: event.routeAudit.requestId,
    routeDecision: event.routeAudit.routeDecision,
    metadata: event.routeAudit.metadata,
    complianceSafe: true,
  }

  console.info("[payments.compliance.audit]", safeAuditRecord)
}
