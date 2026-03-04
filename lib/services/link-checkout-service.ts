import { createHash, randomUUID } from "crypto"

import { trackLinkFunnelMetric } from "@/lib/payments/link-funnel-observability"
import { recordCheckoutAttemptResult } from "@/services/payment-checkout-profile-service"

const LINK_CHECKOUT_API_URL = process.env.RUNASH_LINK_CHECKOUT_API_URL ?? "https://api.runash.in/v3/pay"

const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504])
const RETRYABLE_ERROR_CODES = new Set([
  "rate_limited",
  "timeout",
  "upstream_unavailable",
  "temporarily_unavailable",
  "network_error",
])

const SAFE_ERROR_CODE_BY_PROVIDER_CODE: Record<string, LinkCheckoutSafeErrorCode> = {
  rate_limited: "rate_limited",
  timeout: "timeout",
  upstream_unavailable: "temporarily_unavailable",
  temporarily_unavailable: "temporarily_unavailable",
  network_error: "network_error",
  card_declined: "payment_declined",
  insufficient_funds: "payment_declined",
  authentication_required: "authentication_required",
  invalid_request: "invalid_request",
}

export type LinkCheckoutSafeErrorCode =
  | "none"
  | "rate_limited"
  | "timeout"
  | "temporarily_unavailable"
  | "network_error"
  | "payment_declined"
  | "authentication_required"
  | "invalid_request"
  | "checkout_failed"

export interface LinkCheckoutRequest {
  merchant_id: string
  amount: number
  currency: "INR" | "USD"
  product_metadata: {
    item_name: string
    sku: string
    tags: string[]
  }
  human_confirmed?: boolean
  mfa_verified?: boolean
  default_payment_method?: string
  backup_payment_method?: string
  idempotency_key?: string
  tax_preview?: {
    subtotal: number
    tax: number
    total: number
    tax_label: string
    tax_rate_percent: number
    country: string
    region: string | null
    currency: string
  }
  tax_line_items?: Array<{
    type: string
    label: string
    jurisdiction: string
    rate_percent: number
    amount: number
  }>
}

export interface LinkCheckoutAttemptResult {
  method: string
  reason: "primary" | "fallback_retry" | "no_retry"
  success: boolean
  retryable_failure: boolean
  status_code: number | null
  provider_status: string | null
  error_code: string | null
  safe_error_code: LinkCheckoutSafeErrorCode
  checkout_session_id: string | null
}

export interface LinkCheckoutAttemptTimelineEntry {
  method: string
  reason: "primary" | "fallback_retry" | "no_retry"
  status: "initiated" | "failed"
  timestamp: string
}

export interface LinkCheckoutActivitySummary {
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

export interface LinkCheckoutFinalResult {
  status: "initiated" | "failed"
  checkout_session_id: string | null
  request_id: string
  idempotency_key: string
  next_action: "open_link_checkout" | "retry_or_manual_review"
  fallback_used: boolean
  fallbackUsed: boolean
  attempted_methods: string[]
  attemptedMethods: string[]
  final_status: "initiated" | "failed"
  attempts: LinkCheckoutAttemptResult[]
  attempt_timeline: LinkCheckoutAttemptTimelineEntry[]
  attemptTimeline: LinkCheckoutAttemptTimelineEntry[]
  activity_summary: LinkCheckoutActivitySummary
}

type PersistAttemptFn = (input: {
  checkoutSessionId: string
  customerId: string
  attemptStatus: "completed" | "failed"
  attemptResultCode?: string | null
  attemptResultMessage?: string | null
  metadata?: Record<string, unknown>
}) => Promise<void>

function buildIdempotencyKey(payload: LinkCheckoutRequest): string {
  if (payload.idempotency_key) return payload.idempotency_key

  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        merchant_id: payload.merchant_id,
        amount: payload.amount,
        currency: payload.currency,
        sku: payload.product_metadata.sku,
      }),
    )
    .digest("hex")

  return `link:${payload.merchant_id}:${digest}`
}

function normalizeString(input: unknown): string | null {
  if (typeof input !== "string") return null
  const normalized = input.trim()
  return normalized.length > 0 ? normalized : null
}

function resolveCheckoutSessionId(responseBody: Record<string, unknown>): string | null {
  return normalizeString(responseBody.checkout_session_id) ?? normalizeString(responseBody.session_id)
}

function resolveProviderStatus(responseBody: Record<string, unknown>): string | null {
  return normalizeString(responseBody.provider_status) ?? normalizeString(responseBody.status)
}

function resolveErrorCode(responseBody: Record<string, unknown>): string | null {
  return normalizeString(responseBody.error_code) ?? normalizeString(responseBody.code)
}

function resolveSafeErrorCode(status: number | null, responseBody: Record<string, unknown>): LinkCheckoutSafeErrorCode {
  const providerCode = resolveErrorCode(responseBody)

  if (providerCode != null && SAFE_ERROR_CODE_BY_PROVIDER_CODE[providerCode]) {
    return SAFE_ERROR_CODE_BY_PROVIDER_CODE[providerCode]
  }

  if (status === null) return "network_error"
  if (status === 408) return "timeout"
  if (status === 429) return "rate_limited"
  if (status === 400 || status === 422) return "invalid_request"
  if (status === 401 || status === 403) return "authentication_required"
  if (status >= 500) return "temporarily_unavailable"

  return "checkout_failed"
}

function isRetryableFailure(status: number | null, responseBody: Record<string, unknown>): boolean {
  if (status != null && RETRYABLE_HTTP_STATUSES.has(status)) return true

  if (responseBody.retryable === true) return true

  const code = resolveErrorCode(responseBody)
  return code != null && RETRYABLE_ERROR_CODES.has(code)
}

function buildSessionKey(merchantId: string, idempotencyKey: string) {
  const keyDigest = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 16)
  return `link_session_${merchantId}_${keyDigest}`
}

async function persistAttempt(
  persist: PersistAttemptFn,
  input: {
    merchantId: string
    idempotencyKey: string
    method: string
    attemptNumber: number
    result: LinkCheckoutAttemptResult
    requestId: string
    taxPreview?: LinkCheckoutRequest["tax_preview"]
    taxLineItems?: LinkCheckoutRequest["tax_line_items"]
    timeline: LinkCheckoutAttemptTimelineEntry[]
  },
) {
  await persist({
    checkoutSessionId: input.result.checkout_session_id ?? buildSessionKey(input.merchantId, input.idempotencyKey),
    customerId: input.merchantId,
    attemptStatus: input.result.success ? "completed" : "failed",
    attemptResultCode: input.result.error_code,
    attemptResultMessage: input.result.success ? "Link checkout initiated" : "Link checkout attempt failed",
    metadata: {
      idempotency_key: input.idempotencyKey,
      request_id: input.requestId,
      payment_method: input.method,
      attempt_number: input.attemptNumber,
      retryable_failure: input.result.retryable_failure,
      status_code: input.result.status_code,
      provider_status: input.result.provider_status,
      final_status: input.result.success ? "initiated" : "failed",
      tax_preview: input.taxPreview,
      tax_line_items: input.taxLineItems,
      tax_reporting: {
        subtotal: input.taxPreview?.subtotal ?? null,
        tax: input.taxPreview?.tax ?? null,
        total: input.taxPreview?.total ?? null,
        tax_label: input.taxPreview?.tax_label ?? null,
        line_items: input.taxLineItems ?? [],
      },
      attempt_timeline: input.timeline,
      attempted_methods: input.timeline.map((entry) => entry.method),
      fallback_used: input.timeline.some((entry, idx) => idx > 0),
      attempts: input.timeline.map((entry, idx) => ({
        attempt_number: idx + 1,
        method: entry.method,
        reason: entry.reason,
        status: entry.status,
        timestamp: entry.timestamp,
      })),
    },
  })
}

export async function runLinkCheckoutWithFallback(
  payload: LinkCheckoutRequest,
  deps?: {
    fetchImpl?: typeof fetch
    persistAttemptFn?: PersistAttemptFn
    requestId?: string
  },
): Promise<LinkCheckoutFinalResult> {
  const fetchImpl = deps?.fetchImpl ?? fetch
  const requestId = deps?.requestId ?? randomUUID()
  const idempotencyKey = buildIdempotencyKey(payload)

  const primaryMethod = normalizeString(payload.default_payment_method) ?? "stripe_link"
  const fallbackMethod = normalizeString(payload.backup_payment_method)
  const attemptedMethodsPlan = [primaryMethod, ...(fallbackMethod ? [fallbackMethod] : [])]
  const methods = attemptedMethodsPlan.filter((method, index, all) => all.indexOf(method) === index)

  const resolveAttemptReason = (index: number, previousRetryableFailure: boolean): "primary" | "fallback_retry" | "no_retry" => {
    if (index === 0) return "primary"
    return previousRetryableFailure ? "fallback_retry" : "no_retry"
  }

  const attempts: LinkCheckoutAttemptResult[] = []
  const attemptTimeline: LinkCheckoutAttemptTimelineEntry[] = []

  const persistAttemptFn: PersistAttemptFn =
    deps?.persistAttemptFn ??
    (async (input) => {
      await recordCheckoutAttemptResult({
        checkoutSessionId: input.checkoutSessionId,
        customerId: input.customerId,
        attemptStatus: input.attemptStatus,
        attemptResultCode: input.attemptResultCode,
        attemptResultMessage: input.attemptResultMessage,
        metadata: input.metadata,
      })
    })

  for (let index = 0; index < methods.length; index += 1) {
    const method = methods[index]
    const previousRetryableFailure = index > 0 ? attempts[index - 1]?.retryable_failure === true : false
    const reason = resolveAttemptReason(index, previousRetryableFailure)

    try {
      const response = await fetchImpl(LINK_CHECKOUT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RunAsh-Request-Id": requestId,
          "x-correlation-id": requestId,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          merchant_id: payload.merchant_id,
          amount: payload.amount,
          currency: payload.currency,
          product_metadata: payload.product_metadata,
          human_confirmed: payload.human_confirmed,
          mfa_verified: payload.mfa_verified,
          default_payment_method: primaryMethod,
          backup_payment_method: payload.backup_payment_method,
          payment_method: method,
          idempotency_key: idempotencyKey,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>
      const checkoutSessionId = resolveCheckoutSessionId(responseBody)
      const success = response.ok && checkoutSessionId != null
      const attemptResult: LinkCheckoutAttemptResult = {
        method,
        reason,
        success,
        retryable_failure: !success && isRetryableFailure(response.status, responseBody),
        status_code: response.status,
        provider_status: resolveProviderStatus(responseBody),
        error_code: resolveSafeErrorCode(response.status, responseBody),
        safe_error_code: resolveSafeErrorCode(response.status, responseBody),
        checkout_session_id: checkoutSessionId,
      }

      attempts.push(attemptResult)
      attemptTimeline.push({
        method,
        reason,
        status: success ? "initiated" : "failed",
        timestamp: new Date().toISOString(),
      })

      try {
        await persistAttempt(persistAttemptFn, {
          merchantId: payload.merchant_id,
          idempotencyKey,
          method,
          attemptNumber: index + 1,
          result: attemptResult,
          requestId,
          taxPreview: payload.tax_preview,
          taxLineItems: payload.tax_line_items,
          timeline: attemptTimeline,
        })
      } catch {
        // Persistence failures should not block checkout execution.
      }

      if (success) {
        trackLinkFunnelMetric("checkout_completion", {
          requestId,
          correlationId: requestId,
          merchantId: payload.merchant_id,
        })
        if (index > 0) {
          trackLinkFunnelMetric("fallback_usage", {
            requestId,
            correlationId: requestId,
            merchantId: payload.merchant_id,
          })
        }

        return {
          status: "initiated",
          checkout_session_id: checkoutSessionId,
          request_id: requestId,
          idempotency_key: idempotencyKey,
          next_action: "open_link_checkout",
          fallback_used: index > 0,
          fallbackUsed: index > 0,
          attempted_methods: attempts.map((attempt) => attempt.method),
          attemptedMethods: attempts.map((attempt) => attempt.method),
          final_status: "initiated",
          attempts,
          attempt_timeline: attemptTimeline,
          attemptTimeline,
          activity_summary: {
            provider: "runash_pay",
            endpoint: LINK_CHECKOUT_API_URL,
            request_correlation_id: requestId,
            status: "initiated",
            next_action: "open_link_checkout",
            checkout_session_id: checkoutSessionId,
            fallback_used: index > 0,
            attempts_count: attempts.length,
            attempted_methods: attempts.map((attempt) => attempt.method),
          },
        }
      }

      if (!attemptResult.retryable_failure) break
    } catch {
      const attemptResult: LinkCheckoutAttemptResult = {
        method,
        reason,
        success: false,
        retryable_failure: true,
        status_code: null,
        provider_status: null,
        error_code: "network_error",
        safe_error_code: "network_error",
        checkout_session_id: null,
      }

      attempts.push(attemptResult)
      attemptTimeline.push({
        method,
        reason,
        status: "failed",
        timestamp: new Date().toISOString(),
      })

      try {
        await persistAttempt(persistAttemptFn, {
          merchantId: payload.merchant_id,
          idempotencyKey,
          method,
          attemptNumber: index + 1,
          result: attemptResult,
          requestId,
          taxPreview: payload.tax_preview,
          taxLineItems: payload.tax_line_items,
          timeline: attemptTimeline,
        })
      } catch {
        // Persistence failures should not block checkout execution.
      }
    }
  }

  if (attempts.some((_, index) => index > 0)) {
    trackLinkFunnelMetric("fallback_usage", {
      requestId,
      correlationId: requestId,
      merchantId: payload.merchant_id,
    })
  }

  return {
    status: "failed",
    checkout_session_id: null,
    request_id: requestId,
    idempotency_key: idempotencyKey,
    next_action: "retry_or_manual_review",
    fallback_used: attempts.some((_, index) => index > 0),
    fallbackUsed: attempts.some((_, index) => index > 0),
    attempted_methods: attempts.map((attempt) => attempt.method),
    attemptedMethods: attempts.map((attempt) => attempt.method),
    final_status: "failed",
    attempts,
    attempt_timeline: attemptTimeline,
    attemptTimeline,
    activity_summary: {
      provider: "runash_pay",
      endpoint: LINK_CHECKOUT_API_URL,
      request_correlation_id: requestId,
      status: "failed",
      next_action: "retry_or_manual_review",
      checkout_session_id: null,
      fallback_used: attempts.some((_, index) => index > 0),
      attempts_count: attempts.length,
      attempted_methods: attempts.map((attempt) => attempt.method),
    },
  }
}
