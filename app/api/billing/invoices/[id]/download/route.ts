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
    const invoices = await Database.query<{ id: string; invoice_pdf: string | null; hosted_invoice_url: string | null }>(
      `SELECT id, invoice_pdf, hosted_invoice_url FROM invoices WHERE user_id = $1 AND id = $2 LIMIT 1`,
      [sessionUser.userId, id],
    )

    const invoice = invoices[0]
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found", requestId }, { status: 404, ...withRequestHeaders(requestId) })
    }

    if (!invoice.invoice_pdf && !invoice.hosted_invoice_url) {
      return NextResponse.json({ error: "Invoice download not available", requestId }, { status: 404, ...withRequestHeaders(requestId) })
    }

    const downloadUrl = invoice.invoice_pdf || invoice.hosted_invoice_url
    return NextResponse.redirect(downloadUrl!, withRequestHeaders(requestId))
  } catch (error) {
    logApiRouteError(request, "billing.invoice.download_failed", error, {
      errorCode: "BILLING_INVOICE_DOWNLOAD_FAILED",
      requestId,
    })
    return NextResponse.json({ error: "Internal server error", requestId }, { status: 500, ...withRequestHeaders(requestId) })
  }
}
