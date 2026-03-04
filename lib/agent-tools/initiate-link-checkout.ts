import { randomUUID } from "crypto"

import { z } from "zod"
import {
  evaluateValidatorSafetyGate,
  type PaymentSafetyPolicyDecision,
} from "@/lib/payments/validator-safety-gate"
import { estimateTaxPreview } from "@/lib/payments/tax-estimator"
import { estimateCheckoutTaxBreakdown } from "@/lib/payments/tax-estimation-utility"
import { runLinkCheckoutWithFallback } from "@/lib/services/link-checkout-service"

export const initiateLinkCheckoutToolParameters = {
  type: "object",
  additionalProperties: false,
  required: ["merchant_id", "amount", "currency", "product_metadata"],
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
      description: "ISO currency code. Defaults to USD when omitted by the caller.",
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
    chat_context: {
      type: "object",
      additionalProperties: false,
      required: ["session_id", "user_intent"],
      properties: {
        session_id: {
          type: "string",
          description: "RunAshChat session identifier used for deterministic handoff.",
        },
        user_intent: {
          type: "string",
          description: "Normalized checkout intent phrase from the chat message.",
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
    default_payment_method: {
      type: "string",
      description: "Optional default method for the primary attempt. Defaults to stripe_link when omitted.",
    },
    backup_payment_method: {
      type: "string",
      description: "Optional backup method automatically attempted on retryable failure (for example: card_ending_4242).",
    },
    idempotency_key: {
      type: "string",
      description: "Optional idempotency key reused across primary and fallback attempts.",
    },
    country: {
      type: "string",
      description: "Customer billing country for tax estimation.",
    },
    region: {
      type: "string",
      description: "Customer billing region/state code for tax estimation.",
    },
    preview_displayed: {
      type: "boolean",
      description: "Tax preview card was displayed in RunAshChat before charging.",
      default: false,
    },
    user_confirmation_after_preview: {
      type: "boolean",
      description: "User confirmed checkout after seeing subtotal/tax/total preview.",
      default: false,
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
  chat_context: z
    .object({
      session_id: z.string().trim().min(1),
      user_intent: z.string().trim().min(1),
    })
    .optional(),
  human_confirmed: z.boolean().optional(),
  mfa_verified: z.boolean().optional(),
  default_payment_method: z.string().trim().min(1).optional(),
  backup_payment_method: z.string().trim().min(1).optional(),
  idempotency_key: z.string().trim().min(1).optional(),
  country: z.string().trim().min(2).max(3).optional(),
  region: z.string().trim().min(1).max(30).optional(),
  preview_displayed: z.boolean().default(false),
  user_confirmation_after_preview: z.boolean().default(false),
})

export type InitiateLinkCheckoutActivityPayload = {
  status: "initiated" | "validation_failed" | "failed"
  checkout_session_id: string | null
  request_id: string
  validation_issues?: Array<{
    path: string
    message: string
  }>
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
    safe_error_code: string
    checkout_session_id: string | null
  }>
  attempt_timeline?: Array<{
    method: string
    reason: "primary" | "fallback_retry" | "no_retry"
    status: "initiated" | "failed"
    timestamp: string
  }>
  policy_decision: PaymentSafetyPolicyDecision
  blocked_reason?: "final_charge_blocked_until_user_confirms_after_tax_preview"
  activity_summary?: {
    subtotal: number
    tax: number
    total: number
    currency: "INR" | "USD"
    tax_label: "GST" | "VAT" | "Sales Tax"
    tax_rate_percent: number
    country: string
    region: string | null
  }
  transaction_metadata?: {
    tax_line_items: Array<{
      type: "GST" | "VAT" | "SALES_TAX"
      label: string
      jurisdiction: string
      rate_percent: number
      amount: number
    }>
  }
  execution_activity_summary?: {
    provider: "runash_pay"
    endpoint: string
    request_correlation_id: string
    status: "initiated" | "failed"
    next_action: "open_link_checkout" | "retry_or_manual_review"
    checkout_session_id: string | null
    fallback_used: boolean
    attempts_count: number
    attempted_methods: string[]
  }
  activity_summary_payload: {
    status: "initiated" | "validation_failed" | "failed"
    checkoutId: string | null
    nextAction: "open_link_checkout" | "collect_valid_checkout_fields" | "retry_or_manual_review"
    requestId: string
    taxBreakdown?: {
      subtotal: number
      tax: number
      total: number
      currency: "INR" | "USD"
      label: "GST" | "VAT" | "Sales Tax"
      ratePercent: number
      country: string
      region: string | null
      lineItems: Array<{
        type: "GST" | "VAT" | "SALES_TAX"
        label: string
        jurisdiction: string
        ratePercent: number
        amount: number
      }>
    }
  }
  resolved_handoff_contract?: {
    merchant_id: string
    amount: number
    currency: "INR" | "USD"
    product_metadata: {
      item_name: string
      sku: string
      tags: string[]
    }
    chat_context?: {
      session_id: string
      user_intent: string
    }
    idempotency_key?: string
  }
}

const defaultValidationFailureDecision: PaymentSafetyPolicyDecision = {
  allowed: false,
  requires_hitl: false,
  requires_mfa: false,
  reason_codes: ["INVALID_AMOUNT"],
}

export const initiateLinkCheckoutTool = {
  name: "initiate_link_checkout",
  description: "Triggers Link payment flow inside RunAshChat.",
  parameters: initiateLinkCheckoutToolParameters,
  async execute(args: unknown): Promise<InitiateLinkCheckoutActivityPayload> {
    const requestId = randomUUID()
    const parsed = initiateLinkCheckoutInputSchema.safeParse(args)

    if (!parsed.success) {
      return {
        status: "validation_failed",
        checkout_session_id: null,
        request_id: requestId,
        validation_issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        next_action: "collect_valid_checkout_fields",
        policy_decision: defaultValidationFailureDecision,
        activity_summary_payload: {
          status: "validation_failed",
          checkoutId: null,
          taxBreakdown: {
            subtotal: 0,
            tax: 0,
            total: 0,
            currency: "USD",
            label: "Sales Tax",
            ratePercent: 0,
            country: "US",
            region: null,
            lineItems: [],
          },
          nextAction: "collect_valid_checkout_fields",
          requestId,
        },
      }
    }

    const payload = parsed.data
    const taxPreview = estimateTaxPreview({
      country: payload.country ?? (payload.currency === "INR" ? "IN" : "US"),
      region: payload.region,
      amount: payload.amount,
      currency: payload.currency,
      lineItemMetadata: {
        category: "chat_checkout",
        tags: payload.product_metadata.tags,
      },
    })

    const taxEstimation = estimateCheckoutTaxBreakdown({
      subtotal: payload.amount / 100,
      currency: payload.currency,
      country: payload.country ?? (payload.currency === "INR" ? "IN" : "US"),
      region: payload.region,
    })

    const activitySummary = {
      subtotal: taxEstimation.subtotal,
      tax: taxEstimation.gstVatAmount,
      total: taxEstimation.totalAmount,
      currency: payload.currency,
      tax_label: taxEstimation.taxLabel,
      tax_rate_percent: taxEstimation.taxRatePercent,
      country: taxPreview.country,
      region: taxPreview.region,
    } as const
    const transactionMetadata = {
      tax_line_items: taxPreview.taxLineItems.map((item) => ({
        type: item.type,
        label: item.label,
        jurisdiction: item.jurisdiction,
        rate_percent: item.ratePercent,
        amount: item.amount,
      })),
    }
    const taxBreakdown = {
      subtotal: taxEstimation.subtotal,
      tax: taxEstimation.gstVatAmount,
      total: taxEstimation.totalAmount,
      currency: payload.currency,
      label: taxEstimation.taxLabel,
      ratePercent: taxEstimation.taxRatePercent,
      country: taxPreview.country,
      region: taxPreview.region,
      lineItems: transactionMetadata.tax_line_items.map((lineItem) => ({
        type: lineItem.type,
        label: lineItem.label,
        jurisdiction: lineItem.jurisdiction,
        ratePercent: lineItem.rate_percent,
        amount: lineItem.amount,
      })),
    } as const

    if (!payload.preview_displayed || !payload.user_confirmation_after_preview) {
      return {
        status: "validation_failed",
        checkout_session_id: null,
        request_id: requestId,
        next_action: "collect_valid_checkout_fields",
        blocked_reason: "final_charge_blocked_until_user_confirms_after_tax_preview",
        activity_summary: activitySummary,
        transaction_metadata: transactionMetadata,
        policy_decision: defaultValidationFailureDecision,
        activity_summary_payload: {
          status: "validation_failed",
          checkoutId: null,
          taxBreakdown,
          nextAction: "collect_valid_checkout_fields",
          requestId,
        },
      }
    }

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
        activity_summary: activitySummary,
        transaction_metadata: transactionMetadata,
        execution_activity_summary: {
          provider: "runash_pay",
          endpoint: "https://api.runash.in/v3/pay",
          request_correlation_id: requestId,
          status: "failed",
          next_action: "retry_or_manual_review",
          checkout_session_id: null,
          fallback_used: false,
          attempts_count: 0,
          attempted_methods: [],
        },
        activity_summary_payload: {
          status: "validation_failed",
          checkoutId: null,
          taxBreakdown,
          nextAction: "collect_valid_checkout_fields",
          requestId,
        },
      }
    }

    try {
      const checkoutResult = await runLinkCheckoutWithFallback(
        {
          merchant_id: payload.merchant_id,
          amount: payload.amount,
          currency: payload.currency,
          product_metadata: payload.product_metadata,
          human_confirmed: payload.human_confirmed,
          mfa_verified: payload.mfa_verified,
          default_payment_method: payload.default_payment_method,
          backup_payment_method: payload.backup_payment_method,
          idempotency_key: payload.idempotency_key,
          tax_preview: {
            subtotal: taxPreview.subtotal,
            tax: taxPreview.gstVatAmount,
            total: taxPreview.totalPayable,
            tax_label: taxPreview.taxLabel,
            tax_rate_percent: taxPreview.taxRatePercent,
            country: taxPreview.country,
            region: taxPreview.region,
            currency: taxPreview.currency,
          },
          tax_line_items: transactionMetadata.tax_line_items,
        },
        { requestId },
      )

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
        attempt_timeline: checkoutResult.attempt_timeline,
        policy_decision: policyDecision,
        activity_summary: activitySummary,
        transaction_metadata: transactionMetadata,
        execution_activity_summary: checkoutResult.activity_summary,
        activity_summary_payload: {
          status: checkoutResult.status,
          checkoutId: checkoutResult.checkout_session_id,
          taxBreakdown,
          nextAction: checkoutResult.next_action,
          requestId: checkoutResult.request_id,
        },
        resolved_handoff_contract: {
          merchant_id: payload.merchant_id,
          amount: payload.amount,
          currency: payload.currency,
          product_metadata: payload.product_metadata,
          chat_context: payload.chat_context,
          idempotency_key: checkoutResult.idempotency_key,
        },
      }
    } catch {
      return {
        status: "failed",
        checkout_session_id: null,
        request_id: requestId,
        next_action: "retry_or_manual_review",
        policy_decision: policyDecision,
        activity_summary: activitySummary,
        transaction_metadata: transactionMetadata,
        execution_activity_summary: {
          provider: "runash_pay",
          endpoint: "https://api.runash.in/v3/pay",
          request_correlation_id: requestId,
          status: "failed",
          next_action: "retry_or_manual_review",
          checkout_session_id: null,
          fallback_used: false,
          attempts_count: 0,
          attempted_methods: [],
        },
        activity_summary_payload: {
          status: "failed",
          checkoutId: null,
          taxBreakdown,
          nextAction: "retry_or_manual_review",
          requestId,
        },
      }
    }
  },
}
