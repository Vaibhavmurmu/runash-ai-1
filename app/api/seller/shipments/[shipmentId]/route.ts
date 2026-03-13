import { type NextRequest } from "next/server"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ShippingFulfillmentService, type ShipmentStatus } from "@/services/shipping-fulfillment-service"

export async function PATCH(request: NextRequest, context: { params: Promise<{ shipmentId: string }> }) {
  const params = await context.params
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  const shipmentId = Number.parseInt(params.shipmentId, 10)
  if (Number.isNaN(shipmentId)) {
    return respondError(request, { code: "INVALID_SHIPMENT_ID", message: "Invalid shipmentId" }, { status: 400, legacy: { error: "Invalid shipmentId" } })
  }

  try {
    const body = await request.json()

    if (body.exceptionReason) {
      await ShippingFulfillmentService.handleDeliveryException(shipmentId, String(body.exceptionReason))
      return respondSuccess(request, { shipmentId, status: "exception" }, { legacy: { shipmentId, status: "exception" } })
    }

    if (body.status) {
      await ShippingFulfillmentService.syncTrackingStatus(shipmentId, String(body.status) as ShipmentStatus)
      return respondSuccess(request, { shipmentId, status: body.status }, { legacy: { shipmentId, status: body.status } })
    }

    return respondError(request, { code: "INVALID_REQUEST", message: "Provide status or exceptionReason" }, { status: 400, legacy: { error: "Provide status or exceptionReason" } })
  } catch {
    return respondError(request, { code: "SHIPMENT_UPDATE_FAILED", message: "Failed to update shipment" }, { status: 500, legacy: { error: "Failed to update shipment" } })
  }
}
