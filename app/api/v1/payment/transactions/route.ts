import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { listPaymentTransactions, type PaymentTransactionStatus } from "@/lib/repositories/payment-transactions"

const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["all", "pending", "processing", "completed", "failed", "refunded"]).default("all"),
  query: z.string().trim().max(120).optional(),
})

export async function GET(request: NextRequest) {
  const access = await requireScopedBillingAccess("billing:read")
  if ("response" in access) return access.response

  const parsed = transactionQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_TRANSACTION_QUERY", message: "Invalid transaction query" }, { status: 400 })
  }

  const { page, limit, status, query } = parsed.data
  const offset = (page - 1) * limit

  const result = await listPaymentTransactions({
    limit,
    offset,
    status: status === "all" ? undefined : (status as PaymentTransactionStatus),
    query,
  })

  return respondSuccess(
    request,
    {
      records: result.records,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / limit)),
      },
    },
  )
}
