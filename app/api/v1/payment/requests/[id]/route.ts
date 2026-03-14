import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { updatePaymentRequestStatus } from "@/services/runash-pay-service"

const updateSchema = z
  .object({
    status: z.enum(["pending", "fulfilled", "cancelled"]),
  })
  .strict()

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PAYMENT_REQUEST_UPDATE", message: "Invalid request update payload" }, { status: 400 })
  }

  const updated = await updatePaymentRequestStatus({
    id: params.id,
    ownerUserId: access.sessionUser.userId,
    status: parsed.data.status,
  })

  if (!updated) {
    return respondError(request, { code: "PAYMENT_REQUEST_NOT_FOUND", message: "Payment request not found" }, { status: 404 })
  }

  return respondSuccess(request, updated)
}
