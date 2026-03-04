import { type NextRequest } from "next/server"
import { getSql } from "@/lib/db/neon"
import { DashboardService } from "@/lib/dashboard-service"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"

export async function GET(request: NextRequest) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  const access = await requireScopedBillingAccess("startup")
  if ("response" in access) return access.response

  if (Number(access.sessionUser.userId) !== sellerUserId) {
    return respondError(request, { code: "FORBIDDEN", message: "Forbidden" }, { status: 403, legacy: { error: "Forbidden" } })
  }

  try {
    const sql = getSql()

    const [orderMetrics] = await sql/* sql */`
      SELECT
        COALESCE(SUM(total), 0) AS revenue,
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) AS monthly_orders
      FROM public.orders
      WHERE user_id = ${sellerUserId}
    `

    const [productMetrics] = await sql/* sql */`
      SELECT
        COUNT(*) AS total_products,
        COUNT(*) FILTER (WHERE stock <= 0) AS out_of_stock,
        COALESCE(SUM(stock), 0) AS total_stock,
        COALESCE(SUM(sales), 0) AS total_units_sold
      FROM public.products
      WHERE user_id = ${sellerUserId}
    `

    const streams = await DashboardService.getRecentStreams(sellerUserId, 4)

    const payload = {
      revenue: Number(orderMetrics?.revenue || 0),
      totalOrders: Number(orderMetrics?.total_orders || 0),
      pendingOrders: Number(orderMetrics?.pending_orders || 0),
      monthlyOrders: Number(orderMetrics?.monthly_orders || 0),
      totalProducts: Number(productMetrics?.total_products || 0),
      outOfStock: Number(productMetrics?.out_of_stock || 0),
      totalStock: Number(productMetrics?.total_stock || 0),
      unitsSold: Number(productMetrics?.total_units_sold || 0),
      recentStreams: streams,
    }

    return respondSuccess(request, payload, { legacy: payload })
  } catch {
    return respondError(request, { code: "SELLER_SUMMARY_READ_FAILED", message: "Failed to fetch seller summary" }, { status: 500, legacy: { error: "Failed to fetch seller summary" } })
  }
}
