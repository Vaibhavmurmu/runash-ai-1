import { getSql } from "@/lib/db/neon"

export type CarrierProvider = "shippo" | "easypost" | "manual"

export type ShipmentStatus =
  | "draft"
  | "label_generated"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned"

export interface ShipmentRateLookupInput {
  orderId: number
  sellerUserId: number
  provider: CarrierProvider
  originPostalCode: string
  destinationPostalCode: string
  weightGrams: number
}

export interface ShipmentRateOption {
  provider: CarrierProvider
  serviceLevel: string
  amount: number
  currency: string
  estimatedDays: number
}

export interface ShipmentLabelInput {
  orderId: number
  sellerUserId: number
  provider: CarrierProvider
  serviceLevel: string
  packageWeightGrams: number
}

export interface ShipmentLabelResult {
  shipmentId: number
  trackingNumber: string
  trackingUrl: string
  labelUrl: string
  status: ShipmentStatus
}

export interface TrackingEventPayload {
  eventType: string
  eventCode: string
  status: ShipmentStatus
  location?: string
  eventTimestamp?: string
  metadata?: Record<string, unknown>
}

interface ShippingProviderAdapter {
  lookupRates(input: ShipmentRateLookupInput): Promise<ShipmentRateOption[]>
  generateLabel(input: ShipmentLabelInput): Promise<Omit<ShipmentLabelResult, "shipmentId" | "status">>
  normalizeWebhookEvent(payload: Record<string, unknown>): { trackingNumber: string; event: TrackingEventPayload } | null
}

class ManualShippingProvider implements ShippingProviderAdapter {
  public async lookupRates(input: ShipmentRateLookupInput): Promise<ShipmentRateOption[]> {
    const baseRate = Math.max(4.99, Math.round((input.weightGrams / 1000) * 120) / 100)
    return [
      { provider: "manual", serviceLevel: "standard", amount: baseRate, currency: "USD", estimatedDays: 5 },
      { provider: "manual", serviceLevel: "express", amount: Number((baseRate * 1.65).toFixed(2)), currency: "USD", estimatedDays: 2 },
    ]
  }

  public async generateLabel(input: ShipmentLabelInput): Promise<Omit<ShipmentLabelResult, "shipmentId" | "status">> {
    const token = `${input.orderId}-${Date.now().toString(36)}`
    return {
      trackingNumber: `MNL-${token.slice(-12).toUpperCase()}`,
      trackingUrl: `https://tracking.runash.in/manual/${token}`,
      labelUrl: `https://labels.runash.in/manual/${token}.pdf`,
    }
  }

  public normalizeWebhookEvent(payload: Record<string, unknown>) {
    const trackingNumber = typeof payload.trackingNumber === "string" ? payload.trackingNumber : null
    const status = typeof payload.status === "string" ? (payload.status as ShipmentStatus) : null

    if (!trackingNumber || !status) return null

    return {
      trackingNumber,
      event: {
        eventType: typeof payload.eventType === "string" ? payload.eventType : "carrier_update",
        eventCode: typeof payload.eventCode === "string" ? payload.eventCode : status,
        status,
        location: typeof payload.location === "string" ? payload.location : undefined,
        eventTimestamp: typeof payload.eventTimestamp === "string" ? payload.eventTimestamp : undefined,
        metadata: payload,
      },
    }
  }
}

const providers: Record<CarrierProvider, ShippingProviderAdapter> = {
  shippo: new ManualShippingProvider(),
  easypost: new ManualShippingProvider(),
  manual: new ManualShippingProvider(),
}

function getProvider(provider: CarrierProvider): ShippingProviderAdapter {
  return providers[provider] ?? providers.manual
}

export class ShippingFulfillmentService {
  public static async lookupRates(input: ShipmentRateLookupInput): Promise<ShipmentRateOption[]> {
    const provider = getProvider(input.provider)
    return provider.lookupRates(input)
  }

  public static async createShipmentLabel(input: ShipmentLabelInput): Promise<ShipmentLabelResult> {
    const sql = getSql()
    const provider = getProvider(input.provider)
    const generated = await provider.generateLabel(input)

    const [shipment] = await sql/* sql */`
      INSERT INTO public.shipments (
        order_id,
        seller_user_id,
        provider,
        service_level,
        status,
        tracking_number,
        tracking_url,
        label_url,
        package_weight_grams
      )
      VALUES (
        ${input.orderId},
        ${input.sellerUserId},
        ${input.provider},
        ${input.serviceLevel},
        ${"label_generated"},
        ${generated.trackingNumber},
        ${generated.trackingUrl},
        ${generated.labelUrl},
        ${input.packageWeightGrams}
      )
      RETURNING id, status, tracking_number, tracking_url, label_url
    `

    await this.recordTrackingEvent(shipment.id, {
      eventType: "label",
      eventCode: "label_generated",
      status: "label_generated",
      metadata: { provider: input.provider, serviceLevel: input.serviceLevel },
    })

    await this.enqueueFulfillmentTask({
      shipmentId: shipment.id,
      taskType: "tracking_sync",
      payload: { provider: input.provider },
      runAfterSeconds: 60,
    })

    return {
      shipmentId: shipment.id,
      status: shipment.status,
      trackingNumber: shipment.tracking_number,
      trackingUrl: shipment.tracking_url,
      labelUrl: shipment.label_url,
    }
  }

  public static async syncTrackingStatus(shipmentId: number, status?: ShipmentStatus): Promise<void> {
    const sql = getSql()
    const [shipment] = await sql/* sql */`
      SELECT id, status, provider
      FROM public.shipments
      WHERE id = ${shipmentId}
      LIMIT 1
    `

    if (!shipment) return

    const nextStatus = status ?? (shipment.status === "label_generated" ? "in_transit" : shipment.status)

    if (nextStatus === shipment.status) return

    await sql/* sql */`
      UPDATE public.shipments
      SET status = ${nextStatus},
          last_synced_at = now(),
          updated_at = now()
      WHERE id = ${shipmentId}
    `

    await this.recordTrackingEvent(shipmentId, {
      eventType: "sync",
      eventCode: `status_${nextStatus}`,
      status: nextStatus,
      metadata: { source: "sync_worker" },
    })
  }

  public static async handleDeliveryException(shipmentId: number, reason: string): Promise<void> {
    const sql = getSql()

    await sql/* sql */`
      UPDATE public.shipments
      SET status = ${"exception"},
          exception_reason = ${reason},
          updated_at = now()
      WHERE id = ${shipmentId}
    `

    await this.recordTrackingEvent(shipmentId, {
      eventType: "exception",
      eventCode: "delivery_exception",
      status: "exception",
      metadata: { reason },
    })

    await this.enqueueFulfillmentTask({
      shipmentId,
      taskType: "exception_review",
      payload: { reason },
      runAfterSeconds: 0,
    })
  }

  public static async ingestWebhookEvent(provider: CarrierProvider, payload: Record<string, unknown>): Promise<{ accepted: boolean }> {
    const adapter = getProvider(provider)
    const normalized = adapter.normalizeWebhookEvent(payload)
    if (!normalized) return { accepted: false }

    const sql = getSql()
    const [shipment] = await sql/* sql */`
      SELECT id
      FROM public.shipments
      WHERE tracking_number = ${normalized.trackingNumber}
      LIMIT 1
    `

    if (!shipment) return { accepted: false }

    await this.syncTrackingStatus(shipment.id, normalized.event.status)
    await this.recordTrackingEvent(shipment.id, normalized.event)

    if (normalized.event.status === "exception") {
      await this.enqueueFulfillmentTask({
        shipmentId: shipment.id,
        taskType: "exception_review",
        payload: { source: "webhook", eventCode: normalized.event.eventCode },
        runAfterSeconds: 0,
      })
    }

    return { accepted: true }
  }

  public static async listShipmentTimeline(orderId: number, sellerUserId: number) {
    const sql = getSql()
    const shipmentRows = await sql/* sql */`
      SELECT s.id, s.order_id, s.provider, s.service_level, s.status, s.tracking_number, s.tracking_url, s.label_url, s.exception_reason,
             s.created_at, s.updated_at
      FROM public.shipments s
      WHERE s.order_id = ${orderId}
        AND s.seller_user_id = ${sellerUserId}
      ORDER BY s.created_at DESC
      LIMIT 5
    `

    if (shipmentRows.length === 0) return []

    const shipmentIds = shipmentRows.map((row) => row.id)
    const events = await sql/* sql */`
      SELECT id, shipment_id, event_type, event_code, status, location, event_timestamp, metadata, created_at
      FROM public.shipment_tracking_events
      WHERE shipment_id = ANY(${shipmentIds})
      ORDER BY event_timestamp DESC, created_at DESC
    `

    return shipmentRows.map((row) => ({
      ...row,
      events: events.filter((event) => event.shipment_id === row.id),
    }))
  }

  public static async runDueFulfillmentTasks(limit = 25): Promise<{ processed: number }> {
    const sql = getSql()
    const tasks = await sql/* sql */`
      SELECT id, shipment_id, task_type, payload
      FROM public.fulfillment_tasks
      WHERE status = 'pending'
        AND run_after <= now()
      ORDER BY run_after ASC
      LIMIT ${limit}
    `

    for (const task of tasks) {
      await sql/* sql */`UPDATE public.fulfillment_tasks SET status = 'running', updated_at = now() WHERE id = ${task.id}`

      try {
        if (task.task_type === "tracking_sync") {
          await this.syncTrackingStatus(task.shipment_id)
        }
        if (task.task_type === "exception_review") {
          // intentionally light-weight hook: a future agent can notify support queues.
        }

        await sql/* sql */`UPDATE public.fulfillment_tasks SET status = 'completed', updated_at = now(), completed_at = now() WHERE id = ${task.id}`
      } catch {
        await sql/* sql */`
          UPDATE public.fulfillment_tasks
          SET status = 'failed',
              attempt_count = attempt_count + 1,
              last_error = 'processing_failed',
              updated_at = now()
          WHERE id = ${task.id}
        `
      }
    }

    return { processed: tasks.length }
  }

  private static async recordTrackingEvent(shipmentId: number, event: TrackingEventPayload): Promise<void> {
    const sql = getSql()
    await sql/* sql */`
      INSERT INTO public.shipment_tracking_events (
        shipment_id,
        event_type,
        event_code,
        status,
        location,
        event_timestamp,
        metadata
      ) VALUES (
        ${shipmentId},
        ${event.eventType},
        ${event.eventCode},
        ${event.status},
        ${event.location ?? null},
        ${event.eventTimestamp ? new Date(event.eventTimestamp) : new Date()},
        ${event.metadata ?? {}}
      )
    `
  }

  private static async enqueueFulfillmentTask(input: {
    shipmentId: number
    taskType: "tracking_sync" | "exception_review"
    payload?: Record<string, unknown>
    runAfterSeconds: number
  }): Promise<void> {
    const sql = getSql()
    await sql/* sql */`
      INSERT INTO public.fulfillment_tasks (
        shipment_id,
        task_type,
        payload,
        run_after,
        status
      ) VALUES (
        ${input.shipmentId},
        ${input.taskType},
        ${input.payload ?? {}},
        now() + (${input.runAfterSeconds} * interval '1 second'),
        'pending'
      )
    `
  }
}
