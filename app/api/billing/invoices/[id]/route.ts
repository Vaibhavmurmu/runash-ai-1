import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Database } from "@/lib/database"

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      [session.user.id, id],
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
