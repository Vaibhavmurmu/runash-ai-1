import { type NextRequest } from "next/server"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ShippingFulfillmentService, type CarrierProvider } from "@/services/shipping-fulfillment-service"

export async function GET(request: NextRequest) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  const orderIdParam = request.nextUrl.searchParams.get("orderId")
  const orderId = Number.parseInt(orderIdParam ?? "", 10)

  if (Number.isNaN(orderId)) {
    return respondError(request, { code: "INVALID_ORDER_ID", message: "orderId is required" }, { status: 400, legacy: { error: "orderId is required" } })
  }

  try {
    const shipments = await ShippingFulfillmentService.listShipmentTimeline(orderId, sellerUserId)
    return respondSuccess(request, shipments, { legacy: shipments })
  } catch {
    return respondError(request, { code: "SHIPMENT_TRACK_READ_FAILED", message: "Failed to read shipment timeline" }, { status: 500, legacy: { error: "Failed to read shipment timeline" } })
  }
}

export async function POST(request: NextRequest) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  try {
    const body = await request.json()
    const provider = (body.provider ?? "manual") as CarrierProvider

    if (!body.orderId || !body.serviceLevel || !body.packageWeightGrams) {
      return respondError(request, { code: "INVALID_REQUEST", message: "orderId, serviceLevel, and packageWeightGrams are required" }, { status: 400, legacy: { error: "orderId, serviceLevel, and packageWeightGrams are required" } })
    }

    const shipment = await ShippingFulfillmentService.createShipmentLabel({
      orderId: Number(body.orderId),
      sellerUserId,
      provider,
      serviceLevel: String(body.serviceLevel),
      packageWeightGrams: Number(body.packageWeightGrams),
    })

    return respondSuccess(request, shipment, { status: 201, legacy: shipment })
  } catch {
    return respondError(request, { code: "SHIPMENT_CREATE_FAILED", message: "Failed to create shipment" }, { status: 500, legacy: { error: "Failed to create shipment" } })
  }
}
