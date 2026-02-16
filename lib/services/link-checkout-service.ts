import { createHash, randomUUID } from "crypto"

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
  backup_payment_method?: string
  idempotency_key?: string
}

export interface LinkCheckoutAttemptResult {
  method: string
  success: boolean
  retryable_failure: boolean
  status_code: number | null
  provider_status: string | null
  error_code: string | null
  checkout_session_id: string | null
}

export interface LinkCheckoutFinalResult {
  status: "initiated" | "failed"
  checkout_session_id: string | null
  request_id: string
  idempotency_key: string
  next_action: "open_link_checkout" | "retry_or_manual_review"
  fallback_used: boolean
  attempted_methods: string[]
  final_status: "initiated" | "failed"
  attempts: LinkCheckoutAttemptResult[]
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

  const fallbackMethod = normalizeString(payload.backup_payment_method)
  const attemptedMethodsPlan = ["stripe_link", ...(fallbackMethod ? [fallbackMethod] : [])]
  const methods = attemptedMethodsPlan.filter((method, index, all) => all.indexOf(method) === index)

  const attempts: LinkCheckoutAttemptResult[] = []

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

    try {
      const response = await fetchImpl(LINK_CHECKOUT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RunAsh-Request-Id": requestId,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          ...payload,
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
        success,
        retryable_failure: !success && isRetryableFailure(response.status, responseBody),
        status_code: response.status,
        provider_status: resolveProviderStatus(responseBody),
        error_code: resolveErrorCode(responseBody),
        checkout_session_id: checkoutSessionId,
      }

      attempts.push(attemptResult)

      try {
        await persistAttempt(persistAttemptFn, {
          merchantId: payload.merchant_id,
          idempotencyKey,
          method,
          attemptNumber: index + 1,
          result: attemptResult,
          requestId,
        })
      } catch {
        // Persistence failures should not block checkout execution.
      }

      if (success) {
        return {
          status: "initiated",
          checkout_session_id: checkoutSessionId,
          request_id: requestId,
          idempotency_key: idempotencyKey,
          next_action: "open_link_checkout",
          fallback_used: index > 0,
          attempted_methods: attempts.map((attempt) => attempt.method),
          final_status: "initiated",
          attempts,
        }
      }

      if (!attemptResult.retryable_failure) break
    } catch {
      const attemptResult: LinkCheckoutAttemptResult = {
        method,
        success: false,
        retryable_failure: true,
        status_code: null,
        provider_status: null,
        error_code: "network_error",
        checkout_session_id: null,
      }

      attempts.push(attemptResult)

      try {
        await persistAttempt(persistAttemptFn, {
          merchantId: payload.merchant_id,
          idempotencyKey,
          method,
          attemptNumber: index + 1,
          result: attemptResult,
          requestId,
        })
      } catch {
        // Persistence failures should not block checkout execution.
      }
    }
  }

  return {
    status: "failed",
    checkout_session_id: null,
    request_id: requestId,
    idempotency_key: idempotencyKey,
    next_action: "retry_or_manual_review",
    fallback_used: attempts.some((attempt, index) => index > 0 && attempt.success),
    attempted_methods: attempts.map((attempt) => attempt.method),
    final_status: "failed",
    attempts,
  }
}
