import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      return respondError(request, { code: "INVOICE_NOT_FOUND", message: "Invoice not found" }, { status: 404 })
    }

    return respondSuccess(
      request,
      { invoice: invoices[0] },
      {
        legacy: { invoice: invoices[0] },
      },
    )
  } catch (error) {
    logApiRouteError(request, "billing.invoice.get_failed", error, { errorCode: "BILLING_INVOICE_FETCH_FAILED" })
    return respondError(request, { code: "BILLING_INVOICE_FETCH_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
