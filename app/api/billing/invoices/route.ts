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

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? req.headers.get("x-correlation-id") ?? crypto.randomUUID()

  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response
    const { sessionUser } = access

    const limitParam = Number.parseInt(req.nextUrl.searchParams.get("limit") || "10", 10)
    const offsetParam = Number.parseInt(req.nextUrl.searchParams.get("offset") || "0", 10)
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 100)) : 10
    const offset = Number.isFinite(offsetParam) ? Math.max(0, offsetParam) : 0

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
      WHERE i.user_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [sessionUser.userId, limit, offset],
    )

    const totalRows = await Database.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM invoices WHERE user_id = $1`, [
      sessionUser.userId,
    ])

    return NextResponse.json(
      {
        requestId,
        invoices,
        total: Number.parseInt(totalRows[0]?.total || "0", 10),
        limit,
        offset,
      },
      withRequestHeaders(requestId),
    )
  } catch (error) {
    logApiRouteError(req, "billing.invoices.list_failed", error, { errorCode: "BILLING_INVOICES_FETCH_FAILED", requestId })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
