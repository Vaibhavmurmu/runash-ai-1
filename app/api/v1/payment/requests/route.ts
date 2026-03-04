import { randomUUID } from "crypto"
import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess, requireScopedBillingAccess } from "@/lib/billing-auth"
import { createPaymentRequest, listPaymentRequests } from "@/services/runash-pay-service"

const createSchema = z
  .object({
    payerName: z.string().trim().min(1).max(120),
    amount: z.number().positive(),
    note: z.string().trim().max(240).optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("billing:read")
  if ("response" in access) return access.response

  const records = await listPaymentRequests(access.sessionUser.userId)
  return respondSuccess(request, records)
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PAYMENT_REQUEST", message: "Invalid payment request payload" }, { status: 400 })
  }

  const record = await createPaymentRequest({
    id: randomUUID(),
    ownerUserId: access.sessionUser.userId,
    payerName: parsed.data.payerName,
    amount: parsed.data.amount,
    note: parsed.data.note,
  })

  return respondSuccess(request, record, { status: 201 })
}
