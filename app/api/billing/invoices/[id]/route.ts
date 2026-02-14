import { type NextRequest, NextResponse } from "next/server"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"
import { logApiRouteError } from "@/lib/api/logging"

function withRequestHeaders(requestId: string) {
  return {
    headers: {
      "x-request-id": requestId,
      "x-correlation-id": requestId,
    },
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? request.headers.get("x-correlation-id") ?? crypto.randomUUID()

  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response
    const { sessionUser } = access

    const { id } = await context.params
    const invoices = await Database.query(
      `
      SELECT i.*, COALESCE(
        json_agg(
          json_build_object(
            'id', ili.id,
            'description', ili.description,
            'quantity', ili.quantity,
            'unit_amount', ili.unit_amount,
            'amount', ili.amount,
            'period_start', ili.period_start,
            'period_end', ili.period_end,
            'proration', ili.proration
          )
        ) FILTER (WHERE ili.id IS NOT NULL),
        '[]'::json
      ) AS line_items
      FROM invoices i
      LEFT JOIN invoice_line_items ili ON ili.invoice_id = i.id
      WHERE i.user_id = $1 AND i.id = $2
      GROUP BY i.id
      LIMIT 1
      `,
      [sessionUser.userId, id],
    )

    if (!invoices[0]) {
      return NextResponse.json({ error: "Invoice not found", requestId }, { status: 404, ...withRequestHeaders(requestId) })
    }

    return NextResponse.json({ requestId, invoice: invoices[0] }, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(request, "billing.invoice.get_failed", error, { errorCode: "BILLING_INVOICE_FETCH_FAILED", requestId })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
