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
    const invoices = await Database.query<{ id: string; invoice_pdf: string | null; hosted_invoice_url: string | null }>(
      `SELECT id, invoice_pdf, hosted_invoice_url FROM invoices WHERE user_id = $1 AND id = $2 LIMIT 1`,
      [auth.sessionUser.userId, id],
    )

    const invoice = invoices[0]
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (!invoice.invoice_pdf && !invoice.hosted_invoice_url) {
      return NextResponse.json({ error: "Invoice download not available" }, { status: 404 })
    }

    const downloadUrl = invoice.invoice_pdf || invoice.hosted_invoice_url
    return NextResponse.redirect(downloadUrl!)
  } catch (error) {
    console.error("Download invoice error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
