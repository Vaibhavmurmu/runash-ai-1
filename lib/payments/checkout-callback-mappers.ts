import type { PaymentResolvedStatus } from "@/lib/payments/checkout-status-resolution"

export function mapResolutionToFinalStatus(resolvedStatus: PaymentResolvedStatus) {
  if (resolvedStatus === "complete") return "completed"
  if (resolvedStatus === "error") return "failed"
  if (resolvedStatus === "incomplete") return "expired"
  return "pending"
}
