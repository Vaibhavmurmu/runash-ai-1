import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ShippingFulfillmentService, type CarrierProvider } from "@/services/shipping-fulfillment-service"

const WEBHOOK_SECRET_HEADER = "x-shipping-webhook-secret"

function isWebhookAuthorized(request: NextRequest): boolean {
  const configured = process.env.SHIPPING_WEBHOOK_SECRET
  if (!configured) return true
  return request.headers.get(WEBHOOK_SECRET_HEADER) === configured
}

export async function POST(request: NextRequest) {
  if (!isWebhookAuthorized(request)) {
    return respondError(request, { code: "UNAUTHORIZED", message: "Unauthorized webhook" }, { status: 401, legacy: { error: "Unauthorized webhook" } })
  }

  try {
    const body = await request.json()
    const provider = (body.provider ?? "manual") as CarrierProvider
    const accepted = await ShippingFulfillmentService.ingestWebhookEvent(provider, body.payload ?? {})

    return respondSuccess(request, accepted, { legacy: accepted })
  } catch {
    return respondError(request, { code: "SHIPMENT_WEBHOOK_FAILED", message: "Failed to process shipment webhook" }, { status: 500, legacy: { error: "Failed to process shipment webhook" } })
  }
}
