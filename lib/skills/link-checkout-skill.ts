import { createHash } from "crypto"

import { z } from "zod"
import { logPaymentComplianceAudit } from "@/lib/payments/compliance-audit"
import {
  createPaymentRoutingAuditEvent,
  getPaymentRoutingRequestId,
  resolveEdgeRoutingPolicy,
  withRouteContextMetadata,
} from "@/lib/payments/edge-routing-policy"
import { evaluatePaymentValidatorGate, type ValidatorDecision } from "@/lib/payments/validator-gate"
import { sanitizePaymentActivityDetails } from "@/lib/payments/logging-sanitizer"
import { estimateTaxPreview, type TaxPreview } from "@/lib/payments/tax-estimator"

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
    country: {
      type: "string",
      description: "Country code used to estimate GST/VAT for preview",
    },
    region: {
      type: "string",
      description: "State/region code used to estimate GST/VAT for preview",
    },
    merchant_region: {
      type: "string",
      description: "Merchant operating region/country code for residency-aware edge routing",
    },
    preview_displayed: {
      type: "boolean",
      description: "Must be true only after tax preview is shown to user",
      default: false,
    },
    user_confirmation_after_preview: {
      type: "boolean",
      description: "Must be true only when user confirms after preview is displayed",
      default: false,
    },
  },
} as const

const initiateLinkCheckoutArgsSchema = z.object({
  merchant_id: z.string().trim().min(1),
  amount: z.number().finite().int().positive(),
  currency: z.enum(["USD", "INR"]).default("USD"),
  country: z.string().trim().min(2).max(3).optional(),
  region: z.string().trim().min(1).max(30).optional(),
  merchant_region: z.string().trim().min(2).max(20).optional(),
  preview_displayed: z.boolean().default(false),
  user_confirmation_after_preview: z.boolean().default(false),
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
  taxPreview: TaxPreview
  paymentMethodUsed: string
  fallbackPath: string | null
  blockedReason: string | null
  validatorDecision: ValidatorDecision
  receiptPayload: {
    subtotal: number
    taxAmount: number
    totalPayable: number
    currency: string
    taxLabel: "GST" | "VAT"
    taxRatePercent: number
  }
  activity: {
    validatorGate: {
      passed: boolean
      checks: string[]
      merchantFingerprint: string
      validatorDecision: ValidatorDecision
    }
    provider: "stripe_link"
    currency: "USD" | "INR"
    amount: number
    tax: {
      label: "GST" | "VAT"
      ratePercent: number
      amount: number
      totalPayable: number
      country: string
      region: string | null
    }
    transactionContext: {
      regionRoute: "IN_EDGE" | "US_EDGE"
      residencyPolicy: "IN_DATA_RESIDENCY" | "US_DATA_RESIDENCY"
      complianceProfile: "IN_RBI_PROFILE" | "US_STRIPE_PROFILE"
    }
  }
}

async function runValidatorGate(input: InitiateLinkCheckoutArgs) {
  const checks: string[] = ["pii_safe_logging:passed"]

  const mfaVerified = process.env.RUNASH_LINK_CHECKOUT_MFA_VERIFIED === "true"
  const humanConfirmed = process.env.RUNASH_LINK_CHECKOUT_HUMAN_CONFIRMED === "true"

  const validatorDecision = evaluatePaymentValidatorGate({
    amountMinor: input.amount,
    currency: input.currency,
    humanConfirmed,
    mfaVerified,
  })

  if (validatorDecision.requiresHitl) {
    checks.push(validatorDecision.allowed ? "hitl_precheck:passed" : "hitl_precheck:failed")
  } else {
    checks.push("hitl_precheck:not_required")
  }

  if (validatorDecision.requiresMfa) {
    checks.push(validatorDecision.allowed ? "mfa_precheck:passed" : "mfa_precheck:failed")
  } else {
    checks.push("mfa_precheck:not_required")
  }

  return {
    passed: validatorDecision.allowed,
    checks,
    fallbackPath: validatorDecision.allowed ? null : "manual_review_queue",
    merchantFingerprint: createHash("sha256").update(input.merchant_id).digest("hex").slice(0, 12),
    validatorDecision,
  }
}


function buildActivitySummary(
  payload: InitiateLinkCheckoutArgs,
  gate: Awaited<ReturnType<typeof runValidatorGate>>,
  taxPreview: TaxPreview,
  transactionContext: {
    regionRoute: "IN_EDGE" | "US_EDGE"
    residencyPolicy: "IN_DATA_RESIDENCY" | "US_DATA_RESIDENCY"
    complianceProfile: "IN_RBI_PROFILE" | "US_STRIPE_PROFILE"
  },
  result: {
    status?: unknown
    tax?: unknown
    payment_method?: unknown
    payment_method_used?: unknown
    fallback_path?: unknown
  },
): CheckoutActivitySummary {
  const rawTax = typeof result.tax === "number" ? result.tax : Number(result.tax ?? taxPreview.gstVatAmount)

  return {
    status: typeof result.status === "string" ? result.status : gate.passed ? "approved" : "requires_manual_review",
    tax: Number.isFinite(rawTax) ? rawTax : 0,
    taxPreview,
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
    blockedReason: null,
    receiptPayload: {
      subtotal: taxPreview.subtotal,
      taxAmount: taxPreview.gstVatAmount,
      totalPayable: taxPreview.totalPayable,
      currency: payload.currency,
      taxLabel: taxPreview.taxLabel,
      taxRatePercent: taxPreview.taxRatePercent,
    },
    activity: {
      validatorGate: {
        passed: gate.passed,
        checks: gate.checks,
        merchantFingerprint: gate.merchantFingerprint,
        validatorDecision: gate.validatorDecision,
      },
      provider: "stripe_link",
      currency: payload.currency,
      amount: payload.amount,
      tax: {
        label: taxPreview.taxLabel,
        ratePercent: taxPreview.taxRatePercent,
        amount: taxPreview.gstVatAmount,
        totalPayable: taxPreview.totalPayable,
        country: taxPreview.country,
        region: taxPreview.region,
      },
      transactionContext,
    },
    validatorDecision: gate.validatorDecision,
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
    const edgeRouting = resolveEdgeRoutingPolicy({
      merchantRegion: payload.merchant_region,
      customerRegion: payload.country,
    })
    const requestId = getPaymentRoutingRequestId()
    const transactionContext = {
      regionRoute: edgeRouting.regionRoute,
      residencyPolicy: edgeRouting.residencyPolicy,
      complianceProfile: edgeRouting.complianceProfile,
    } as const
    const routeAudit = createPaymentRoutingAuditEvent({
      requestId,
      decision: edgeRouting,
      metadata: {
        currency: payload.currency,
        amount: payload.amount,
        merchant_region: payload.merchant_region,
        customer_region: payload.country,
      },
    })

    if (!payload.preview_displayed || !payload.user_confirmation_after_preview) {
      return {
        ...buildActivitySummary(payload, gate, taxPreview, transactionContext, {
          status: "awaiting_post_preview_confirmation",
          tax: taxPreview.gstVatAmount,
          payment_method_used: "stripe_link",
          fallback_path: null,
        }),
        blockedReason: "final_charge_blocked_until_user_confirms_after_tax_preview",
      }
    }

    if (!gate.passed) {
      logPaymentComplianceAudit({
        event: "runash_pay_request",
        merchantId: payload.merchant_id,
        amountMinor: payload.amount,
        currency: payload.currency,
        provider: "stripe_link",
        validatorPassed: gate.passed,
        edgeRouting,
        routeAudit,
      })

      return buildActivitySummary(payload, gate, taxPreview, transactionContext, {
        status: "requires_manual_review",
        tax: taxPreview.gstVatAmount,
        fallback_path: gate.fallbackPath,
      })
    }

    logPaymentComplianceAudit({
      event: "runash_pay_request",
      merchantId: payload.merchant_id,
      amountMinor: payload.amount,
      currency: payload.currency,
      provider: "stripe_link",
      validatorPassed: gate.passed,
      edgeRouting,
      routeAudit,
    })

    const safeRoutingMetadata = withRouteContextMetadata(
      {
        merchant_region: edgeRouting.merchantRegion,
        customer_region: edgeRouting.customerRegion,
      },
      edgeRouting,
    )

    const response = await fetch(LINK_CHECKOUT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RunAsh-Request-Id": requestId,
        "X-RunAsh-Region-Route": edgeRouting.regionRoute,
        "X-RunAsh-Compliance-Profile": edgeRouting.complianceProfile,
      },
      body: JSON.stringify(
        sanitizePaymentActivityDetails({
          ...payload,
          routing_metadata: safeRoutingMetadata,
        } as unknown as Record<string, unknown>),
      ),
      signal: AbortSignal.timeout(10_000),
    })

    const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>

    if (!response.ok) {
      return buildActivitySummary(payload, gate, taxPreview, transactionContext, {
        status: "fallback_initiated",
        tax: responseBody.tax,
        payment_method_used: responseBody.payment_method_used,
        fallback_path: "relay_agent_manual_checkout",
      })
    }

    return buildActivitySummary(payload, gate, taxPreview, transactionContext, responseBody)
  },
}
