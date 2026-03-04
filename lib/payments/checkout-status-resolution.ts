import { getLatestCheckoutAttemptResultBySession, getLatestPaymentAttemptByCheckoutSession, type CheckoutAttemptResultRecord } from "@/services/payment-checkout-profile-service"

export type PaymentStatusRouteState = "success" | "error" | "incomplete" | "pending" | "complete"
export type PaymentResolvedStatus = "complete" | "pending" | "error" | "incomplete"

type ResolveStatusInput = {
  customerId: string
  checkoutSessionId: string
  provider: string
}

export type PaymentStatusSummary = {
  grossAmount: number | null
  netAmount: number | null
  processingFeeAmount: number | null
  taxAmount: number | null
  settlementCurrency: string | null
  occurredAt: string | null
  resultCode: string | null
  resultMessage: string | null
}

export type PaymentResolution = {
  resolvedStatus: PaymentResolvedStatus
  checkoutSessionId: string
  provider: string
  providerTransactionReference: string | null
  attemptId: string | null
  source: "webhook-backed-state" | "provider-session-query"
  summary: PaymentStatusSummary
  invoiceDownloadUrl: string | null
}

function mapAttemptToResolvedStatus(status: CheckoutAttemptResultRecord["attemptStatus"]): PaymentResolvedStatus {
  if (status === "completed") return "complete"
  if (status === "failed") return "error"
  if (status === "expired") return "incomplete"
  return "pending"
}

function mapStripeSessionStatus(input: { status: string | null; paymentStatus: string | null }): PaymentResolvedStatus {
  if (input.status === "expired") return "incomplete"
  if (input.status === "complete" && (input.paymentStatus === "paid" || input.paymentStatus === "no_payment_required")) {
    return "complete"
  }
  if (input.paymentStatus === "unpaid") return "error"
  return "pending"
}

function getNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }
  return null
}

function buildSummary(attempt: CheckoutAttemptResultRecord | null): PaymentStatusSummary {
  const reporting = ((attempt?.metadata as Record<string, unknown> | undefined)?.reporting ?? {}) as Record<string, unknown>

  return {
    grossAmount: getNumberOrNull(reporting.grossAmount),
    netAmount: getNumberOrNull(reporting.netAmount),
    processingFeeAmount: getNumberOrNull(reporting.processingFeeAmount),
    taxAmount: getNumberOrNull(reporting.taxAmount),
    settlementCurrency: typeof reporting.settlementCurrency === "string" ? reporting.settlementCurrency : null,
    occurredAt: attempt?.occurredAt ?? null,
    resultCode: attempt?.attemptResultCode ?? null,
    resultMessage: attempt?.attemptResultMessage ?? null,
  }
}

function buildInvoiceDownloadUrl(attempt: CheckoutAttemptResultRecord | null) {
  const metadata = (attempt?.metadata ?? {}) as Record<string, unknown>
  if (typeof metadata.invoiceId !== "string" || metadata.invoiceId.length === 0) {
    return null
  }

  return `/api/v1/billing/invoices/${metadata.invoiceId}/receipt`
}

export async function resolvePaymentStatus(input: ResolveStatusInput): Promise<PaymentResolution> {
  const persistedAttempt =
    (await getLatestPaymentAttemptByCheckoutSession({
      customerId: input.customerId,
      checkoutSessionId: input.checkoutSessionId,
    })) ??
    (await getLatestCheckoutAttemptResultBySession({
      customerId: input.customerId,
      checkoutSessionId: input.checkoutSessionId,
    }))

  if (persistedAttempt) {
    const metadata = (persistedAttempt.metadata ?? {}) as Record<string, unknown>

    return {
      resolvedStatus: mapAttemptToResolvedStatus(persistedAttempt.attemptStatus),
      checkoutSessionId: input.checkoutSessionId,
      provider: input.provider,
      providerTransactionReference:
        typeof metadata.providerTransactionReference === "string" ? metadata.providerTransactionReference : null,
      attemptId: persistedAttempt.id,
      source: "webhook-backed-state",
      summary: buildSummary(persistedAttempt),
      invoiceDownloadUrl: buildInvoiceDownloadUrl(persistedAttempt),
    }
  }

  if (input.provider === "stripe" && process.env.STRIPE_SECRET_KEY) {
    const { default: Stripe } = await import("stripe")
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
    const checkoutSession = await stripe.checkout.sessions.retrieve(input.checkoutSessionId)

    return {
      resolvedStatus: mapStripeSessionStatus({
        status: checkoutSession.status,
        paymentStatus: checkoutSession.payment_status,
      }),
      checkoutSessionId: input.checkoutSessionId,
      provider: input.provider,
      providerTransactionReference: checkoutSession.id,
      attemptId: null,
      source: "provider-session-query",
      summary: {
        grossAmount: checkoutSession.amount_total ?? null,
        netAmount: checkoutSession.amount_subtotal ?? null,
        processingFeeAmount: null,
        taxAmount: checkoutSession.total_details?.amount_tax ?? null,
        settlementCurrency: checkoutSession.currency?.toUpperCase() ?? null,
        occurredAt: null,
        resultCode: null,
        resultMessage: null,
      },
      invoiceDownloadUrl: null,
    }
  }

  return {
    resolvedStatus: "pending",
    checkoutSessionId: input.checkoutSessionId,
    provider: input.provider,
    providerTransactionReference: null,
    attemptId: null,
    source: "provider-session-query",
    summary: {
      grossAmount: null,
      netAmount: null,
      processingFeeAmount: null,
      taxAmount: null,
      settlementCurrency: null,
      occurredAt: null,
      resultCode: null,
      resultMessage: null,
    },
    invoiceDownloadUrl: null,
  }
}
