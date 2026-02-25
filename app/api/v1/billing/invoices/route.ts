import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { ensureInvoiceSupportTables, syncInvoiceStatusFromAttempts } from "@/lib/billing/invoice-store"
import { Database } from "@/lib/database"
import { calculateInvoiceTotals } from "@/lib/billing/invoice-calculations"

const createInvoiceSchema = z.object({
  customer: z.object({
    reference: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(2).max(160),
    email: z.string().email(),
  }),
  dueDate: z.string().datetime(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(2).max(300),
        quantity: z.number().int().positive(),
        unitAmount: z.number().nonnegative(),
        periodStart: z.string().datetime().optional(),
        periodEnd: z.string().datetime().optional(),
        proration: z.boolean().optional(),
      }),
    )
    .min(1),
  tax: z.object({
    amount: z.number().nonnegative(),
    ratePercent: z.number().min(0).max(100).optional(),
    countryCode: z.string().trim().length(2).optional(),
    stateCode: z.string().trim().min(2).max(10).optional(),
  }),
  description: z.string().trim().max(400).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await ensureInvoiceSupportTables()

    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response
    const { sessionUser } = access

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") || "10", 10)
    const offsetParam = Number.parseInt(request.nextUrl.searchParams.get("offset") || "0", 10)
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 100)) : 10
    const offset = Number.isFinite(offsetParam) ? Math.max(0, offsetParam) : 0

    const invoiceRows = await Database.query(
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
      ) AS tax_breakdown,
      json_build_object(
        'subtotal_amount', COALESCE(tc.taxable_amount, i.amount_due, i.total, 0),
        'tax_amount', COALESCE(tc.total_tax_amount, 0),
        'total_amount', COALESCE(tc.total_amount, i.amount_paid, i.amount_due, i.total, 0),
        'tax_inclusive', true
      ) AS financial_summary
      , COALESCE(
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
      WHERE i.user_id = $1
      GROUP BY i.id, tc.id, cd.invoice_id
      ORDER BY i.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [sessionUser.userId, limit, offset],
    )

    for (const row of invoiceRows as Array<{ id: string | number }>) {
      await syncInvoiceStatusFromAttempts(row.id)
    }

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
      WHERE i.user_id = $1
      GROUP BY i.id, tc.id, cd.invoice_id
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

export async function POST(request: NextRequest) {
  try {
    await ensureInvoiceSupportTables()

    const access = await requireScopedBillingAccess("startup")
    if ("response" in access) return access.response
    const { sessionUser } = access

    const payload = await request.json()
    const parsed = createInvoiceSchema.safeParse(payload)
    if (!parsed.success) {
      return respondError(request, { code: "INVALID_INVOICE_PAYLOAD", message: "Invalid invoice payload" }, { status: 400 })
    }

    const { customer, dueDate, currency, lineItems, tax, description } = parsed.data
    const dueDateValue = new Date(dueDate)
    if (Number.isNaN(dueDateValue.getTime())) {
      return respondError(request, { code: "INVALID_DUE_DATE", message: "Invalid due date" }, { status: 400 })
    }

    const { subtotalCents, taxCents, totalCents } = calculateInvoiceTotals(lineItems, tax.amount)

    const insertedInvoices = await Database.query<{ id: number }>(
      `
      INSERT INTO invoices (user_id, amount_due, amount_paid, currency, status, description, due_date)
      VALUES ($1, $2, 0, $3, 'open', $4, $5)
      RETURNING id
      `,
      [sessionUser.userId, totalCents, currency, description || `Invoice for ${customer.name}`, dueDateValue.toISOString()],
    )

    const invoiceId = insertedInvoices[0]?.id
    if (!invoiceId) {
      return respondError(request, { code: "INVOICE_CREATE_FAILED", message: "Failed to create invoice" }, { status: 500 })
    }

    await Database.query(
      `
      INSERT INTO invoice_customer_details (invoice_id, customer_reference, customer_name, customer_email, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (invoice_id) DO UPDATE
      SET customer_reference = EXCLUDED.customer_reference,
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          updated_at = NOW()
      `,
      [invoiceId, customer.reference ?? null, customer.name, customer.email],
    )

    for (const item of lineItems) {
      const unitAmountCents = Math.round(item.unitAmount * 100)
      const amountCents = unitAmountCents * item.quantity
      await Database.query(
        `
        INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_amount, amount, period_start, period_end, proration)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          invoiceId,
          item.description,
          item.quantity,
          unitAmountCents,
          amountCents,
          item.periodStart ? new Date(item.periodStart).toISOString() : null,
          item.periodEnd ? new Date(item.periodEnd).toISOString() : null,
          item.proration ?? false,
        ],
      )
    }

    await Database.query(
      `
      INSERT INTO tax_calculations (
        source_type, source_id, country_code, state_code, currency,
        taxable_amount, total_tax_amount, total_amount, jurisdiction_details
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      ON CONFLICT (source_type, source_id) DO UPDATE
      SET country_code = EXCLUDED.country_code,
          state_code = EXCLUDED.state_code,
          currency = EXCLUDED.currency,
          taxable_amount = EXCLUDED.taxable_amount,
          total_tax_amount = EXCLUDED.total_tax_amount,
          total_amount = EXCLUDED.total_amount,
          jurisdiction_details = EXCLUDED.jurisdiction_details,
          updated_at = NOW()
      `,
      [
        "invoice",
        String(invoiceId),
        tax.countryCode?.toUpperCase() ?? "UN",
        tax.stateCode?.toUpperCase() ?? null,
        currency,
        subtotalCents / 100,
        taxCents / 100,
        totalCents / 100,
        JSON.stringify({
          rate_percent: tax.ratePercent ?? null,
          source: "invoice_create_form",
        }),
      ],
    )

    return respondSuccess(request, {
      invoiceId,
      status: "open",
      amountDue: totalCents,
      amountPaid: 0,
      currency,
    })
  } catch (error) {
    logApiRouteError(request, "billing.invoices.create_failed", error, { errorCode: "BILLING_INVOICE_CREATE_FAILED" })
    return respondError(request, { code: "BILLING_INVOICE_CREATE_FAILED", message: "Internal server error" }, { status: 500 })
  }
}
