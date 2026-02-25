import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { ensureInvoiceSupportTables, syncInvoiceStatusFromAttempts } from "@/lib/billing/invoice-store"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureInvoiceSupportTables()

    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response
    const { sessionUser } = access

    const { id } = await context.params
    await syncInvoiceStatusFromAttempts(id)

    const invoices = await Database.query(
      `
      SELECT i.*, cd.customer_reference, cd.customer_name, cd.customer_email, COALESCE(
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
      ) AS line_items,
      COALESCE(
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
      ) AS tax_breakdown,
      json_build_object(
        'subtotal_amount', COALESCE(tc.taxable_amount, i.amount_due, i.total, 0),
        'tax_amount', COALESCE(tc.total_tax_amount, 0),
        'total_amount', COALESCE(tc.total_amount, i.amount_paid, i.amount_due, i.total, 0),
        'tax_inclusive', true
      ) AS financial_summary,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', ipa.id,
              'provider', ipa.provider,
              'provider_reference', ipa.provider_reference,
              'status', ipa.status,
              'amount', ipa.amount,
              'currency', ipa.currency,
              'failure_reason', ipa.failure_reason,
              'event_source', ipa.event_source,
              'occurred_at', ipa.occurred_at
            ) ORDER BY ipa.occurred_at DESC NULLS LAST, ipa.created_at DESC
          )
          FROM invoice_payment_attempts ipa
          WHERE ipa.invoice_id = i.id
        ),
        '[]'::json
      ) AS payment_attempts
      FROM invoices i
      LEFT JOIN invoice_customer_details cd ON cd.invoice_id = i.id
      LEFT JOIN invoice_line_items ili ON ili.invoice_id = i.id
      LEFT JOIN tax_calculations tc ON tc.source_type = 'invoice' AND tc.source_id = i.id::text
      WHERE i.user_id = $1 AND i.id = $2
      GROUP BY i.id, tc.id, cd.invoice_id
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
