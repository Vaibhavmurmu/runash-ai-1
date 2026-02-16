import { randomUUID } from "crypto"

import { z } from "zod"
import {
  evaluateValidatorSafetyGate,
  type PaymentSafetyPolicyDecision,
} from "@/lib/payments/validator-safety-gate"
import { runLinkCheckoutWithFallback } from "@/lib/services/link-checkout-service"

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
    human_confirmed: {
      type: "boolean",
      description: "Indicates whether a human explicitly confirmed high-value checkout actions.",
    },
    mfa_verified: {
      type: "boolean",
      description: "Indicates whether the user passed MFA before checkout confirmation.",
    },
    backup_payment_method: {
      type: "string",
      description: "Optional backup method automatically attempted on retryable failure (for example: card_ending_4242).",
    },
    idempotency_key: {
      type: "string",
      description: "Optional idempotency key reused across primary and fallback attempts.",
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
  human_confirmed: z.boolean().optional(),
  mfa_verified: z.boolean().optional(),
  backup_payment_method: z.string().trim().min(1).optional(),
  idempotency_key: z.string().trim().min(1).optional(),
})

export type InitiateLinkCheckoutActivityPayload = {
  status: "initiated" | "validation_failed" | "failed"
  checkout_session_id: string | null
  request_id: string
  idempotency_key?: string
  next_action: "open_link_checkout" | "collect_valid_checkout_fields" | "retry_or_manual_review"
  fallback_used?: boolean
  attempted_methods?: string[]
  final_status?: "initiated" | "failed"
  attempts?: Array<{
    method: string
    success: boolean
    retryable_failure: boolean
    status_code: number | null
    provider_status: string | null
    error_code: string | null
    checkout_session_id: string | null
  }>
  policy_decision: PaymentSafetyPolicyDecision
}

const defaultValidationFailureDecision: PaymentSafetyPolicyDecision = {
  allowed: false,
  requires_hitl: false,
  requires_mfa: false,
  reason_codes: ["INVALID_AMOUNT"],
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
        policy_decision: defaultValidationFailureDecision,
      }
    }

    const payload = parsed.data
    const policyDecision = evaluateValidatorSafetyGate({
      amount_minor: payload.amount,
      currency: payload.currency,
      human_confirmed: payload.human_confirmed,
      mfa_verified: payload.mfa_verified,
    })

    if (!policyDecision.allowed) {
      return {
        status: "validation_failed",
        checkout_session_id: null,
        request_id: requestId,
        next_action: "collect_valid_checkout_fields",
        policy_decision: policyDecision,
      }
    }

    try {
      const checkoutResult = await runLinkCheckoutWithFallback(payload, { requestId })

      return {
        status: checkoutResult.status,
        checkout_session_id: checkoutResult.checkout_session_id,
        request_id: checkoutResult.request_id,
        idempotency_key: checkoutResult.idempotency_key,
        next_action: checkoutResult.next_action,
        fallback_used: checkoutResult.fallback_used,
        attempted_methods: checkoutResult.attempted_methods,
        final_status: checkoutResult.final_status,
        attempts: checkoutResult.attempts,
        policy_decision: policyDecision,
      }
    } catch {
      return {
        status: "failed",
        checkout_session_id: null,
        request_id: requestId,
        next_action: "retry_or_manual_review",
        policy_decision: policyDecision,
      }
    }
  },
}
