import { type NextRequest } from "next/server"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ShippingFulfillmentService } from "@/services/shipping-fulfillment-service"

export async function POST(request: NextRequest, { params }: { params: { shipmentId: string } }) {
  const sellerUserId = await requireSellerSessionUserId(request)
  if (sellerUserId instanceof Response) return sellerUserId

  const shipmentId = Number.parseInt(params.shipmentId, 10)
  if (Number.isNaN(shipmentId)) {
    return respondError(request, { code: "INVALID_SHIPMENT_ID", message: "Invalid shipmentId" }, { status: 400, legacy: { error: "Invalid shipmentId" } })
  }

  try {
    await ShippingFulfillmentService.syncTrackingStatus(shipmentId)
    return respondSuccess(request, { shipmentId, synced: true }, { legacy: { shipmentId, synced: true } })
  } catch {
    return respondError(request, { code: "SHIPMENT_TRACK_SYNC_FAILED", message: "Failed to sync shipment tracking" }, { status: 500, legacy: { error: "Failed to sync shipment tracking" } })
  }
}
