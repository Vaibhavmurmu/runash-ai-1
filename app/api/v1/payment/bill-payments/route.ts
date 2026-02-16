import { randomUUID } from "crypto"
import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess, requireScopedBillingAccess } from "@/lib/billing-auth"
import { createBillPayment, listBillPayments } from "@/services/runash-pay-service"

const createSchema = z
  .object({
    billerName: z.string().trim().min(1).max(120),
    amount: z.number().positive(),
    dueDate: z.string().date().optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("billing:read")
  if ("response" in access) return access.response

  const records = await listBillPayments(access.sessionUser.userId)
  return respondSuccess(request, records)
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_BILL_PAYMENT", message: "Invalid bill payment payload" }, { status: 400 })
  }

  const record = await createBillPayment({
    id: randomUUID(),
    ownerUserId: access.sessionUser.userId,
    billerName: parsed.data.billerName,
    amount: parsed.data.amount,
    dueDate: parsed.data.dueDate,
  })

  return respondSuccess(request, record, { status: 201 })
}
