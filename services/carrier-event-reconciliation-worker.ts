import { ShippingFulfillmentService } from "@/services/shipping-fulfillment-service"

let active = false

export async function runCarrierEventReconciliation(limit = 50) {
  if (active) {
    return { processed: 0, skipped: true }
  }

  active = true
  try {
    const result = await ShippingFulfillmentService.runDueFulfillmentTasks(limit)
    return { ...result, skipped: false }
  } finally {
    active = false
  }
}
