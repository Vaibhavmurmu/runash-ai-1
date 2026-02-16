import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireBillingActionAccess } from "@/lib/billing-auth"
import {
  createPortalLifecycleAction,
  listPortalLifecycleActions,
  updateCustomerPaymentMethodRole,
} from "@/services/payment-checkout-profile-service"

const lifecycleSchema = z
  .object({
    actionType: z.enum(["update_method", "retry_failed_payment", "subscription_state_change"]),
    role: z.enum(["default", "backup"]).optional(),
    paymentMethodRefId: z.string().min(1).optional(),
    subscriptionAction: z.enum(["cancel", "reactivate"]).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const actions = await listPortalLifecycleActions(access.sessionUser.userId)
  return respondSuccess(request, actions)
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = lifecycleSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_PORTAL_LIFECYCLE_PAYLOAD", message: "Invalid lifecycle payload" }, { status: 400 })
  }

  if (parsed.data.actionType === "update_method") {
    if (!parsed.data.role || !parsed.data.paymentMethodRefId) {
      return respondError(
        request,
        { code: "MISSING_METHOD_UPDATE_FIELDS", message: "role and paymentMethodRefId are required for update_method action" },
        { status: 400 },
      )
    }

    const switched = await updateCustomerPaymentMethodRole({
      customerId: access.sessionUser.userId,
      role: parsed.data.role,
      paymentMethodRefId: parsed.data.paymentMethodRefId,
    })

    if (!switched) {
      return respondError(request, { code: "PAYMENT_METHOD_NOT_FOUND", message: "Payment method reference not found" }, { status: 404 })
    }
  }

  const action = await createPortalLifecycleAction({
    customerId: access.sessionUser.userId,
    actionType: parsed.data.actionType,
    metadata: {
      ...parsed.data.metadata,
      role: parsed.data.role,
      paymentMethodRefId: parsed.data.paymentMethodRefId,
      subscriptionAction: parsed.data.subscriptionAction,
    },
  })

  return respondSuccess(request, action, { status: 201 })
}
