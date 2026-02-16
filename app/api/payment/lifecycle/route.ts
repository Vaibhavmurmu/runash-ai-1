import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { logPrivilegedAction } from "@/lib/audit-logging"
import { logApiRouteError } from "@/lib/api/logging"
import { createLifecycleEvent, getLifecycleSnapshot } from "@/lib/customer-lifecycle-analytics-service"

const eventSchema = z.object({
  eventType: z.string().min(1),
  source: z.enum(["web", "api", "agent_action"]),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("finance:read")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const lifecycle = await getLifecycleSnapshot()

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.lifecycle.analytics.viewed",
      resource: "payment.lifecycle.analytics",
      request,
      details: { source: "api" },
    })

    return NextResponse.json({ success: true, data: lifecycle })
  } catch (error) {
    logApiRouteError(request, "payment.lifecycle.analytics.fetch_failed", error, {
      errorCode: "PAYMENT_LIFECYCLE_ANALYTICS_FETCH_FAILED",
    })
    return NextResponse.json({ error: "Failed to fetch lifecycle analytics" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response
  const { sessionUser } = access

  try {
    const payload = await request.json()
    const parsed = eventSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid lifecycle event payload", details: parsed.error.flatten() }, { status: 400 })
    }

    const customerScopeError = ensureCustomerScopedAccess(sessionUser, { customerId: sessionUser.userId, organizationId: sessionUser.organizationId })
    if (customerScopeError) return customerScopeError

    const event = await createLifecycleEvent({
      customerId: sessionUser.userId,
      eventType: parsed.data.eventType,
      source: parsed.data.source,
      actorUserId: sessionUser.userId,
      metadata: parsed.data.metadata,
    })

    await logPrivilegedAction({
      actorUserId: sessionUser.userId,
      action: "payment.lifecycle.event.created",
      resource: "payment.lifecycle.event",
      request,
      details: { source: parsed.data.source, eventType: parsed.data.eventType },
    })

    return NextResponse.json({ success: true, data: event }, { status: 201 })
  } catch (error) {
    logApiRouteError(request, "payment.lifecycle.event.create_failed", error, {
      errorCode: "PAYMENT_LIFECYCLE_EVENT_CREATE_FAILED",
    })
    return NextResponse.json({ error: "Failed to record lifecycle event" }, { status: 500 })
  }
}
