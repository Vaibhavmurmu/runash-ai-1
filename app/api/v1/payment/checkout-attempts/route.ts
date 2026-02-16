import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { listCheckoutAttemptResults, recordCheckoutAttemptResult } from "@/services/payment-checkout-profile-service"

const checkoutAttemptSchema = z
  .object({
    checkoutSessionId: z.string().min(1),
    paymentMethodRefId: z.string().min(1).nullable().optional(),
    attemptStatus: z.enum(["authorized", "completed", "failed", "expired"]),
    attemptResultCode: z.string().min(1).nullable().optional(),
    attemptResultMessage: z.string().min(1).nullable().optional(),
    metadata: z
      .record(z.unknown())
      .optional()
      .transform((value) => {
        const metadata = (value ?? {}) as Record<string, unknown>
        const reporting = (metadata.reporting ?? {}) as Record<string, unknown>
        const normalizedReporting = {
          grossAmount: Number(reporting.grossAmount ?? 0),
          netAmount: Number(reporting.netAmount ?? 0),
          processingFeeAmount: Number(reporting.processingFeeAmount ?? 0),
          taxAmount: Number(reporting.taxAmount ?? 0),
          payoutAmount: Number(reporting.payoutAmount ?? 0),
          taxWithheldAmount: Number(reporting.taxWithheldAmount ?? 0),
          exchangeRate: Number(reporting.exchangeRate ?? 1),
          settlementCurrency: typeof reporting.settlementCurrency === "string" ? reporting.settlementCurrency : null,
          taxJurisdiction: typeof reporting.taxJurisdiction === "string" ? reporting.taxJurisdiction : null,
          payoutSchedule: typeof reporting.payoutSchedule === "string" ? reporting.payoutSchedule : null,
        }

        return {
          ...metadata,
          reporting: normalizedReporting,
        }
      }),
    occurredAt: z.string().datetime().optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 100)
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(500, limitParam)) : 100
  const attempts = await listCheckoutAttemptResults(access.sessionUser.userId, limit)
  return respondSuccess(request, attempts)
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = checkoutAttemptSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_CHECKOUT_ATTEMPT_PAYLOAD", message: "Invalid checkout attempt payload" }, { status: 400 })
  }

  const attempt = await recordCheckoutAttemptResult({
    customerId: access.sessionUser.userId,
    ...parsed.data,
  })

  return respondSuccess(request, attempt, { status: 201 })
}
