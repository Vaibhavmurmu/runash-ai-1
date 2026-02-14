import { NextResponse } from "next/server"
import { requireBillingSession, requireScopedRole } from "@/lib/billing-auth"
import { Database } from "@/lib/database"

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireBillingSession()
    if (auth.unauthorizedResponse || !auth.sessionUser) {
      return auth.unauthorizedResponse
    }

    const roleResponse = requireScopedRole(auth.sessionUser, "startup")
    if (roleResponse) return roleResponse

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
      [auth.sessionUser.userId, id],
    )

    if (!invoices[0]) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json({ invoice: invoices[0] })
  } catch (error) {
    console.error("Get invoice error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
