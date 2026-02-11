import { type NextRequest } from "next/server"
import { PaymentService } from "@/lib/payment-service"
import { respondError, respondSuccess } from "@/lib/api/envelope"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency, paymentMethodId, metadata } = body

    if (!amount || !currency || !paymentMethodId) {
      return respondError(
        request,
        {
          code: "MISSING_REQUIRED_FIELDS",
          message: "Missing required fields: amount, currency, paymentMethodId",
        },
        {
          status: 400,
          legacy: { error: "Missing required fields: amount, currency, paymentMethodId" },
        },
      )
    }

    if (typeof amount !== "number" || amount <= 0) {
      return respondError(
        request,
        {
          code: "INVALID_AMOUNT",
          message: "Amount must be a positive number",
        },
        {
          status: 400,
          legacy: { error: "Amount must be a positive number" },
        },
      )
    }

    const isValidMethod = await PaymentService.validatePaymentMethod(paymentMethodId, currency)
    if (!isValidMethod) {
      return respondError(
        request,
        {
          code: "INVALID_PAYMENT_METHOD",
          message: "Invalid payment method for the specified currency",
        },
        {
          status: 400,
          legacy: { error: "Invalid payment method for the specified currency" },
        },
      )
    }

    const intent = await PaymentService.createPaymentIntent(amount, currency, paymentMethodId, metadata || {})

    return respondSuccess(request, intent, {
      legacy: {
        success: true,
        data: intent,
      },
    })
  } catch (error) {
    console.error("Payment intent creation failed:", error)
    return respondError(
      request,
      {
        code: "PAYMENT_INTENT_CREATION_FAILED",
        message: "Failed to create payment intent",
      },
      {
        status: 500,
        legacy: { error: "Failed to create payment intent" },
      },
    )
  }
}
