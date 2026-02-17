import { type NextRequest, NextResponse } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { resolveRequestId } from "@/lib/api/response"
import { logApiRouteError } from "@/lib/api/logging"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { Database } from "@/lib/database"

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = resolveRequestId(request)

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
      return respondError(request, { code: "INVOICE_NOT_FOUND", message: "Invoice not found" }, { status: 404, requestId })
    }

    if (!invoice.invoice_pdf && !invoice.hosted_invoice_url) {
      return respondError(
        request,
        { code: "INVOICE_DOWNLOAD_NOT_AVAILABLE", message: "Invoice download not available" },
        { status: 404, requestId },
      )
    }

    const downloadUrl = invoice.invoice_pdf || invoice.hosted_invoice_url
    if (request.nextUrl.searchParams.get("redirect") === "false") {
      return respondSuccess(
        request,
        { invoiceId: invoice.id, downloadUrl },
        { legacy: { invoice_id: invoice.id, download_url: downloadUrl }, requestId },
      )
    }

    return NextResponse.redirect(downloadUrl!, {
      headers: {
        "x-request-id": requestId,
        "x-correlation-id": requestId,
      },
    })
  } catch (error) {
    logApiRouteError(request, "billing.invoice.download_failed", error, {
      errorCode: "BILLING_INVOICE_DOWNLOAD_FAILED",
      requestId,
    })
    return respondError(request, { code: "BILLING_INVOICE_DOWNLOAD_FAILED", message: "Internal server error" }, { status: 500, requestId })
  }
}
