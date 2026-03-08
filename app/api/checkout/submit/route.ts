import { NextResponse } from "next/server"
import { z } from "zod"
import { checkoutOrderSchema } from "@/lib/types/checkout-order"
import { getServerAuthSession } from "@/lib/auth/session"
import { CheckoutSubmissionError, submitCheckoutOrder } from "@/lib/services/checkout-submission-service"

const submitCheckoutSchema = z.object({
  order: checkoutOrderSchema,
})

async function requireBuyerSessionUserId(req: Request): Promise<string | Response> {
  const session = await getServerAuthSession(req.headers)
  const rawUserId = session?.user?.id?.toString().trim()

  if (!rawUserId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
  }

  return rawUserId
}

export async function POST(req: Request) {
  const userId = await requireBuyerSessionUserId(req)
  if (userId instanceof Response) return userId

  const rawBody = await req.json().catch(() => ({}))
  const parsed = submitCheckoutSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid checkout payload",
        code: "INVALID_CHECKOUT_PAYLOAD",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      },
      { status: 400 },
    )
  }

  try {
    const origin = new URL(req.url).origin
    const result = await submitCheckoutOrder({
      order: parsed.data.order,
      customerId: userId,
      origin,
      cookieHeader: req.headers.get("cookie"),
      userAgent: req.headers.get("user-agent"),
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    if (error instanceof CheckoutSubmissionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }

    return NextResponse.json({ error: "Failed to submit checkout", code: "CHECKOUT_SUBMISSION_FAILED" }, { status: 500 })
  }
}
