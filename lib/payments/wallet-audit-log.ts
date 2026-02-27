import { createHash } from "crypto"

import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"

function fingerprint(value: string | null | undefined) {
  if (!value) return null
  return createHash("sha256").update(value).digest("hex").slice(0, 16)
}

export function logWalletPaymentTransition(event: {
  requestId: string
  action: string
  status: "allowed" | "blocked" | "review" | "success" | "failed"
  userId?: string | null
  sessionId?: string | null
  reasonCodes?: string[]
  metadata?: Record<string, unknown>
}) {
  const safeRecord = sanitizePaymentActivityDetails({
    request_id: event.requestId,
    action: event.action,
    status: event.status,
    reason_codes: event.reasonCodes ?? [],
    user_fingerprint: fingerprint(event.userId),
    session_fingerprint: fingerprint(event.sessionId),
    metadata: event.metadata ?? {},
  })

  console.info("[wallet.payment.audit]", safeRecord)
}
