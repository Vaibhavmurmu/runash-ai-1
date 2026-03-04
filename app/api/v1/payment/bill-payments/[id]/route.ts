import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import { updateBillPaymentStatus } from "@/services/runash-pay-service"

const updateSchema = z
  .object({
    status: z.enum(["scheduled", "paid", "failed"]),
  })
  .strict()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_BILL_PAYMENT_UPDATE", message: "Invalid bill payment update payload" }, { status: 400 })
  }

  const updated = await updateBillPaymentStatus({
    id: params.id,
    ownerUserId: access.sessionUser.userId,
    status: parsed.data.status,
  })

  if (!updated) {
    return respondError(request, { code: "BILL_PAYMENT_NOT_FOUND", message: "Bill payment not found" }, { status: 404 })
  }

  return respondSuccess(request, updated)
}
