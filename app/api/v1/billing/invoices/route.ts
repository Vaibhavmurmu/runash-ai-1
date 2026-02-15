import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response
    const { sessionUser } = access

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") || "10", 10)
    const offsetParam = Number.parseInt(request.nextUrl.searchParams.get("offset") || "0", 10)
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
      , COALESCE(
        json_build_object(
          'country_code', tc.country_code,
          'state_code', tc.state_code,
          'currency', tc.currency,
          'taxable_amount', tc.taxable_amount,
          'total_tax_amount', tc.total_tax_amount,
          'total_amount', tc.total_amount,
          'jurisdiction_details', tc.jurisdiction_details,
          'line_items', COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', tli.id,
                  'jurisdiction_level', tli.jurisdiction_level,
                  'jurisdiction_code', tli.jurisdiction_code,
                  'tax_type', tli.tax_type,
                  'tax_name', tli.tax_name,
                  'rate_percent', tli.rate_percent,
                  'taxable_amount', tli.taxable_amount,
                  'tax_amount', tli.tax_amount
                )
              )
              FROM tax_line_items tli
              WHERE tli.tax_calculation_id = tc.id
            ),
            '[]'::json
          )
        ),
        '{}'::json
      ) AS tax_breakdown
      FROM invoices i
      LEFT JOIN invoice_line_items ili ON ili.invoice_id = i.id
      LEFT JOIN tax_calculations tc ON tc.source_type = 'invoice' AND tc.source_id = i.id::text
      WHERE i.user_id = $1
      GROUP BY i.id, tc.id
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [sessionUser.userId, limit, offset],
    )

    const totalRows = await Database.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM invoices WHERE user_id = $1`, [
      sessionUser.userId,
    ])

    const total = Number.parseInt(totalRows[0]?.total || "0", 10)

    return respondSuccess(
      request,
      {
        invoices,
        total,
        limit,
        offset,
      },
      {
        legacy: { invoices, total, limit, offset },
      },
    )
  } catch (error) {
    logApiRouteError(request, "billing.invoices.list_failed", error, { errorCode: "BILLING_INVOICES_FETCH_FAILED" })
    return respondError(request, { code: "BILLING_INVOICES_FETCH_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
