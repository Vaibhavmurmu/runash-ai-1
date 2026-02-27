import type { PaymentResolvedStatus, PaymentStatusRouteState } from "@/lib/payments/checkout-status-resolution"

export function mapResolvedStatusToRouteState(resolved: PaymentResolvedStatus): PaymentStatusRouteState {
  if (resolved === "complete") return "complete"
  if (resolved === "error") return "error"
  if (resolved === "incomplete") return "incomplete"
  return "pending"
}
