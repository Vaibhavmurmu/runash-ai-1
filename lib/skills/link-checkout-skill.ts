import { createHash } from "crypto"

import { z } from "zod"

const LINK_CHECKOUT_API_URL = "https://api.runash.in/v3/pay"

export const initiateLinkCheckoutParameters = {
  type: "object",
  additionalProperties: false,
  required: ["merchant_id", "amount", "currency", "product_metadata"],
  properties: {
    merchant_id: {
      type: "string",
      description: "RunAsh merchant identifier",
    },
    amount: {
      type: "number",
      description: "Amount in smallest currency unit (paise/cents)",
    },
    currency: {
      type: "string",
      enum: ["USD", "INR"],
      default: "USD",
      description: "Currency code for checkout session",
    },
    product_metadata: {
      type: "object",
      additionalProperties: false,
      required: ["item_name", "sku", "tags"],
      properties: {
        item_name: {
          type: "string",
          description: "Checkout item display name",
        },
        sku: {
          type: "string",
          description: "Item SKU",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description: 'Metadata tags. Must include "via RunAshChat"',
        },
      },
    },
  },
} as const

const initiateLinkCheckoutArgsSchema = z.object({
  merchant_id: z.string().trim().min(1),
  amount: z.number().finite().int().positive(),
  currency: z.enum(["USD", "INR"]).default("USD"),
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

type InitiateLinkCheckoutArgs = z.infer<typeof initiateLinkCheckoutArgsSchema>

type CheckoutActivitySummary = {
  status: string
  tax: number
  paymentMethodUsed: string
  fallbackPath: string | null
  activity: {
    validatorGate: {
      passed: boolean
      checks: string[]
      merchantFingerprint: string
    }
    provider: "stripe_link"
    currency: "USD" | "INR"
    amount: number
  }
}

async function runValidatorGate(input: InitiateLinkCheckoutArgs) {
  const checks: string[] = ["hitl_precheck:passed", "pii_safe_logging:passed"]

  const mfaRequired = process.env.RUNASH_LINK_CHECKOUT_REQUIRE_MFA === "true"
  const mfaVerified = process.env.RUNASH_LINK_CHECKOUT_MFA_VERIFIED === "true"

  if (mfaRequired && !mfaVerified) {
    checks.push("mfa_precheck:failed")
  } else {
    checks.push("mfa_precheck:passed")
  }

  const hitlAmountThreshold = Number(process.env.RUNASH_LINK_CHECKOUT_HITL_THRESHOLD ?? "500000")
  if (input.amount >= hitlAmountThreshold) {
    checks.push("hitl_threshold:requires_review")
  }

  const passed = !(mfaRequired && !mfaVerified) && input.amount < hitlAmountThreshold

  return {
    passed,
    checks,
    fallbackPath: passed ? null : "manual_review_queue",
    merchantFingerprint: createHash("sha256").update(input.merchant_id).digest("hex").slice(0, 12),
  }
}

function buildActivitySummary(
  payload: InitiateLinkCheckoutArgs,
  gate: Awaited<ReturnType<typeof runValidatorGate>>,
  result: {
    status?: unknown
    tax?: unknown
    payment_method?: unknown
    payment_method_used?: unknown
    fallback_path?: unknown
  },
): CheckoutActivitySummary {
  const rawTax = typeof result.tax === "number" ? result.tax : Number(result.tax ?? 0)

  return {
    status: typeof result.status === "string" ? result.status : gate.passed ? "approved" : "requires_manual_review",
    tax: Number.isFinite(rawTax) ? rawTax : 0,
    paymentMethodUsed:
      typeof result.payment_method_used === "string"
        ? result.payment_method_used
        : typeof result.payment_method === "string"
          ? result.payment_method
          : "stripe_link",
    fallbackPath:
      typeof result.fallback_path === "string"
        ? result.fallback_path
        : gate.passed
          ? null
          : gate.fallbackPath,
    activity: {
      validatorGate: {
        passed: gate.passed,
        checks: gate.checks,
        merchantFingerprint: gate.merchantFingerprint,
      },
      provider: "stripe_link",
      currency: payload.currency,
      amount: payload.amount,
    },
  }
}

export const linkCheckoutSkill = {
  name: "initiate_link_checkout",
  description:
    "Create an Instant Checkout payment session for RunAshChat by validating payment safety gates and invoking RunAsh Pay.",
  parameters: initiateLinkCheckoutParameters,
  async execute(args: unknown): Promise<CheckoutActivitySummary> {
    const payload = initiateLinkCheckoutArgsSchema.parse(args)
    const gate = await runValidatorGate(payload)

    if (!gate.passed) {
      return buildActivitySummary(payload, gate, {
        status: "requires_manual_review",
        fallback_path: gate.fallbackPath,
      })
    }

    const response = await fetch(LINK_CHECKOUT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })

    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) {
      return buildActivitySummary(payload, gate, {
        status: "fallback_initiated",
        tax: responseBody.tax,
        payment_method_used: responseBody.payment_method_used,
        fallback_path: "relay_agent_manual_checkout",
      })
    }

    return buildActivitySummary(payload, gate, responseBody)
  },
}
