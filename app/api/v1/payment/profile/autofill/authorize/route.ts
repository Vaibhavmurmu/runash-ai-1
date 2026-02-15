import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireScopedBillingAccess } from "@/lib/billing-auth"
import { authorizeCheckoutAutofill } from "@/services/payment-checkout-profile-service"

const authorizeSchema = z
  .object({
    checkoutSlug: z.string().min(1),
    preferBackupMethod: z.boolean().optional(),
    deviceContext: z.record(z.unknown()).optional(),
    browserContext: z.record(z.unknown()).optional(),
  })
  .strict()


function resolveSessionContexts(request: NextRequest) {
  return {
    deviceContext: {
      ipHint: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
      acceptLanguage: request.headers.get("accept-language") ?? "",
      secChUaPlatform: request.headers.get("sec-ch-ua-platform") ?? "",
    },
    browserContext: {
      userAgent: request.headers.get("user-agent") ?? "",
    },
  }
}

export async function POST(request: NextRequest) {
  const access = await requireScopedBillingAccess("business")
  if ("response" in access) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = authorizeSchema.safeParse(body)
  if (!parsed.success) {
    return respondError(request, { code: "INVALID_AUTOFILL_AUTH_PAYLOAD", message: "Invalid autofill authorization payload" }, { status: 400 })
  }

  const contexts = resolveSessionContexts(request)

  const authorization = await authorizeCheckoutAutofill({
    customerId: access.sessionUser.userId,
    linkSlug: parsed.data.checkoutSlug,
    preferBackupMethod: parsed.data.preferBackupMethod,
    deviceContext: { ...contexts.deviceContext, ...(parsed.data.deviceContext ?? {}) },
    browserContext: { ...contexts.browserContext, ...(parsed.data.browserContext ?? {}) },
  })

  if (!authorization) {
    return respondError(
      request,
      {
        code: "CHECKOUT_AUTOFILL_NOT_AUTHORIZED",
        message: "Checkout link is not active, expired, or unavailable for autofill authorization.",
      },
      { status: 403 },
    )
  }

  return respondSuccess(request, authorization)
}
