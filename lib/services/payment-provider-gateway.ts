import type { PaymentMethod } from "@/lib/payment-service"

export type ProviderPaymentStatus = "processing" | "completed" | "failed"

export interface ProviderCreateIntentResult {
  providerIntentId: string
  providerStatus: string
  event: Record<string, unknown>
}

export interface ProviderConfirmPaymentResult {
  providerTransactionId: string
  status: ProviderPaymentStatus
  providerStatus: string
  failureReason?: string
  event: Record<string, unknown>
}

interface ProviderAdapter {
  createIntent(input: {
    intentId: string
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    metadata: Record<string, unknown>
  }): Promise<ProviderCreateIntentResult>
  confirmPayment(input: {
    intentId: string
    providerIntentId: string
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    metadata: Record<string, unknown>
  }): Promise<ProviderConfirmPaymentResult>
}

function providerEventId(prefix: string, baseId: string) {
  return `${prefix}_event_${baseId}`
}

class DeterministicProviderAdapter implements ProviderAdapter {
  constructor(private readonly provider: string) {}

  async createIntent(input: {
    intentId: string
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    metadata: Record<string, unknown>
  }): Promise<ProviderCreateIntentResult> {
    return {
      providerIntentId: `${this.provider}_pi_${input.intentId}`,
      providerStatus: "requires_confirmation",
      event: {
        provider: this.provider,
        eventId: providerEventId(this.provider, input.intentId),
        type: "intent.created",
        amount: input.amount,
        currency: input.currency,
      },
    }
  }

  async confirmPayment(input: {
    intentId: string
    providerIntentId: string
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    metadata: Record<string, unknown>
  }): Promise<ProviderConfirmPaymentResult> {
    const forcedStatus = input.metadata.providerOutcome
    const status: ProviderPaymentStatus =
      forcedStatus === "failed" || forcedStatus === "processing" || forcedStatus === "completed"
        ? forcedStatus
        : "completed"

    return {
      providerTransactionId: `${this.provider}_txn_${input.intentId}`,
      status,
      providerStatus:
        status === "completed" ? "captured" : status === "processing" ? "pending_confirmation" : "failed",
      failureReason: status === "failed" ? "Provider declined payment" : undefined,
      event: {
        provider: this.provider,
        eventId: providerEventId(this.provider, `${input.intentId}_confirm`),
        type: `payment.${status}`,
        amount: input.amount,
        currency: input.currency,
      },
    }
  }
}

const defaultAdapter = new DeterministicProviderAdapter("generic")

const adapters: Record<string, ProviderAdapter> = {
  stripe: new DeterministicProviderAdapter("stripe"),
  razorpay: new DeterministicProviderAdapter("razorpay"),
  paytm: new DeterministicProviderAdapter("paytm"),
  phonepe: new DeterministicProviderAdapter("phonepe"),
  googlepay: new DeterministicProviderAdapter("googlepay"),
  amazonpay: new DeterministicProviderAdapter("amazonpay"),
  simpl: new DeterministicProviderAdapter("simpl"),
}

export function getProviderAdapter(provider: string): ProviderAdapter {
  return adapters[provider] ?? defaultAdapter
}
