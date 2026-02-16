import { randomUUID } from "crypto"

import { z } from "zod"

const LINK_CHECKOUT_API_URL = process.env.RUNASH_LINK_CHECKOUT_API_URL ?? "https://api.runash.in/v3/pay"

export const initiateLinkCheckoutToolParameters = {
  type: "object",
  additionalProperties: false,
  required: ["merchant_id", "amount", "product_metadata"],
  properties: {
    merchant_id: {
      type: "string",
      description: "RunAsh merchant identifier that owns the checkout request.",
    },
    amount: {
      type: "number",
      description: "Charge amount in smallest unit (paise/cents).",
    },
    currency: {
      type: "string",
      enum: ["INR", "USD"],
      default: "USD",
      description: "ISO currency code. Defaults to USD when omitted.",
    },
    product_metadata: {
      type: "object",
      additionalProperties: false,
      required: ["item_name", "sku", "tags"],
      properties: {
        item_name: {
          type: "string",
          description: "Display label for the item in checkout.",
        },
        sku: {
          type: "string",
          description: "Inventory SKU identifier.",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: 'Metadata tags for analytics/risk checks. Must include "via RunAshChat".',
        },
      },
    },
  },
} as const

const initiateLinkCheckoutInputSchema = z.object({
  merchant_id: z.string().trim().min(1),
  amount: z.number().finite().int().positive(),
  currency: z.enum(["INR", "USD"]).default("USD"),
  product_metadata: z
    .object({
      item_name: z.string().trim().min(1),
      sku: z.string().trim().min(1),
      tags: z.array(z.string().trim().min(1)).min(1),
    })
    .superRefine((metadata, ctx) => {
      if (!metadata.tags.includes("via RunAshChat")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'product_metadata.tags must include "via RunAshChat"',
          path: ["tags"],
        })
      }
    }),
})

export type InitiateLinkCheckoutActivityPayload = {
  status: "initiated" | "validation_failed" | "failed"
  checkout_session_id: string | null
  request_id: string
  next_action: "open_link_checkout" | "collect_valid_checkout_fields" | "retry_or_manual_review"
}

export const initiateLinkCheckoutTool = {
  name: "initiate_link_checkout",
  description: "Triggers the Link payment flow inside RunAshChat",
  parameters: initiateLinkCheckoutToolParameters,
  async execute(args: unknown): Promise<InitiateLinkCheckoutActivityPayload> {
    const requestId = randomUUID()
    const parsed = initiateLinkCheckoutInputSchema.safeParse(args)

    if (!parsed.success) {
      return {
        status: "validation_failed",
        checkout_session_id: null,
        request_id: requestId,
        next_action: "collect_valid_checkout_fields",
      }
    }

    const payload = parsed.data

    try {
      const response = await fetch(LINK_CHECKOUT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RunAsh-Request-Id": requestId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      })

      const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const checkoutSessionId =
        typeof responseBody.checkout_session_id === "string"
          ? responseBody.checkout_session_id
          : typeof responseBody.session_id === "string"
            ? responseBody.session_id
            : null

      if (!response.ok || !checkoutSessionId) {
        return {
          status: "failed",
          checkout_session_id: null,
          request_id: requestId,
          next_action: "retry_or_manual_review",
        }
      }

      return {
        status: "initiated",
        checkout_session_id: checkoutSessionId,
        request_id: requestId,
        next_action: "open_link_checkout",
      }
    } catch {
      return {
        status: "failed",
        checkout_session_id: null,
        request_id: requestId,
        next_action: "retry_or_manual_review",
      }
    }
  },
}
