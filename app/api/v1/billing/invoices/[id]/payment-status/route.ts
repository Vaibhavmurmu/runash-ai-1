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

    const { id } = await context.params
    await syncInvoiceStatusFromAttempts(id)

    const rows = await Database.query(
      `
      SELECT i.id, i.status, i.amount_due, i.amount_paid, i.currency, i.due_date, i.paid_at,
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
      WHERE i.user_id = $1 AND i.id = $2
      LIMIT 1
      `,
      [access.sessionUser.userId, id],
    )

    if (!rows[0]) {
      return respondError(request, { code: "INVOICE_NOT_FOUND", message: "Invoice not found" }, { status: 404 })
    }

    return respondSuccess(request, {
      invoiceId: rows[0].id,
      status: rows[0].status,
      amountDue: rows[0].amount_due,
      amountPaid: rows[0].amount_paid,
      currency: rows[0].currency,
      dueDate: rows[0].due_date,
      paidAt: rows[0].paid_at,
      paymentAttempts: rows[0].payment_attempts,
    })
  } catch (error) {
    logApiRouteError(request, "billing.invoice.payment_status_failed", error, {
      errorCode: "BILLING_INVOICE_PAYMENT_STATUS_FAILED",
    })
    return respondError(request, { code: "BILLING_INVOICE_PAYMENT_STATUS_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
