import { randomUUID } from "crypto"
import {
  createPaymentIntentRecord,
  getPaymentIntentByCreateIdempotencyKey,
  getPaymentIntentById,
  type PaymentIntentStatus,
  updatePaymentIntentStatus,
} from "@/lib/repositories/payment-intents"
import {
  createPaymentMethodRecord,
  findPaymentMethodById,
  listEnabledPaymentMethods,
  type PaymentMethodRecord,
} from "@/lib/repositories/payment-methods"
import { createPaymentRefundRecord, listRefundsByTransactionId } from "@/lib/repositories/payment-refunds"
import {
  createPaymentTransactionRecord,
  getPaymentTransactionByConfirmIdempotencyKey,
  getPaymentTransactionById,
  getPaymentTransactionByIntentId,
  getPaymentTransactionMonthlyTrends,
  listRecentPaymentTransactions,
  updatePaymentTransaction,
} from "@/lib/repositories/payment-transactions"
import { getProviderAdapter } from "@/lib/services/payment-provider-gateway"
import { getLifecycleSnapshot, type LifecycleSnapshot } from "@/lib/customer-lifecycle-analytics-service"

export interface PaymentMethod {
  id: string
  name: string
  type: "card" | "upi" | "netbanking" | "wallet" | "bnpl"
  provider: string
  icon: string
  enabled: boolean
  processingFee: number
  description: string
  supportedCurrencies: string[]
}

export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled"
  paymentMethod: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface PaymentTransaction {
  id: string
  intentId: string
  amount: number
  currency: string
  status: "pending" | "processing" | "completed" | "failed" | "refunded"
  paymentMethod: string
  provider: string
  providerTransactionId?: string
  processingFee: number
  netAmount: number
  failureReason?: string
  refundAmount?: number
  refundReason?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface PaymentAnalytics {
  lifecycle: LifecycleSnapshot
  totalRevenue: number
  totalTransactions: number
  successRate: number
  averageTransactionValue: number
  topPaymentMethods: Array<{
    method: string
    count: number
    percentage: number
  }>
  monthlyTrends: Array<{
    month: string
    revenue: number
    transactions: number
  }>
  recentTransactions: PaymentTransaction[]
}

function createEntityId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`

  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`
}

function buildCreateIdempotencyKey(input: {
  paymentMethodId: string
  currency: string
  amount: number
  metadata: Record<string, unknown>
}): string {
  return `create:${input.paymentMethodId}:${input.currency}:${input.amount}:${stableStringify(input.metadata)}`
}

function intentStatusFromTransactionStatus(status: PaymentTransaction["status"]): PaymentIntentStatus {
  if (status === "completed" || status === "refunded") return "succeeded"
  if (status === "failed") return "failed"
  return "processing"
}

function statusFromProviderEvent(input: {
  event?: Record<string, unknown>
  providerStatus: string
  fallbackStatus: PaymentTransaction["status"]
}): PaymentTransaction["status"] {
  const eventType = typeof input.event?.type === "string" ? input.event.type.toLowerCase() : ""
  const normalizedProviderStatus = input.providerStatus.toLowerCase()

  if (eventType.endsWith(".failed") || normalizedProviderStatus.includes("fail") || normalizedProviderStatus.includes("declin")) {
    return "failed"
  }

  if (
    eventType.endsWith(".succeeded") ||
    eventType.endsWith(".completed") ||
    eventType.endsWith(".captured") ||
    normalizedProviderStatus.includes("captured") ||
    normalizedProviderStatus.includes("success")
  ) {
    return "completed"
  }

  if (
    eventType.endsWith(".processing") ||
    eventType.includes("pending") ||
    normalizedProviderStatus.includes("pending") ||
    normalizedProviderStatus.includes("processing") ||
    normalizedProviderStatus.includes("requires")
  ) {
    return "processing"
  }

  return input.fallbackStatus
}

function toPublicIntent(record: {
  id: string
  amount: number
  currency: string
  status: PaymentIntentStatus
  paymentMethodId: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}): PaymentIntent {
  return {
    id: record.id,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    paymentMethod: record.paymentMethodId,
    metadata: record.metadata,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}

function toPublicTransaction(record: {
  id: string
  intentId: string
  amount: number
  currency: string
  status: PaymentTransaction["status"]
  paymentMethod: string
  provider: string
  providerTransactionId: string | null
  processingFee: number
  netAmount: number
  failureReason: string | null
  refundAmount: number | null
  refundReason: string | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}): PaymentTransaction {
  return {
    id: record.id,
    intentId: record.intentId,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    paymentMethod: record.paymentMethod,
    provider: record.provider,
    providerTransactionId: record.providerTransactionId ?? undefined,
    processingFee: record.processingFee,
    netAmount: record.netAmount,
    failureReason: record.failureReason ?? undefined,
    refundAmount: record.refundAmount ?? undefined,
    refundReason: record.refundReason ?? undefined,
    metadata: record.metadata,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "stripe-card",
    name: "Credit/Debit Card",
    type: "card",
    provider: "stripe",
    icon: "💳",
    enabled: true,
    processingFee: 2.9,
    description: "Visa, Mastercard, American Express",
    supportedCurrencies: ["INR", "USD", "EUR"],
  },
  {
    id: "razorpay-upi",
    name: "UPI",
    type: "upi",
    provider: "razorpay",
    icon: "📱",
    enabled: true,
    processingFee: 0.5,
    description: "GPay, PhonePe, Paytm, BHIM",
    supportedCurrencies: ["INR"],
  },
  {
    id: "razorpay-netbanking",
    name: "Net Banking",
    type: "netbanking",
    provider: "razorpay",
    icon: "🏦",
    enabled: true,
    processingFee: 1.5,
    description: "All major Indian banks",
    supportedCurrencies: ["INR"],
  },
  {
    id: "paytm-wallet",
    name: "Paytm Wallet",
    type: "wallet",
    provider: "paytm",
    icon: "💰",
    enabled: true,
    processingFee: 1,
    description: "Pay with Paytm balance",
    supportedCurrencies: ["INR"],
  },
  {
    id: "phonepe-upi",
    name: "PhonePe",
    type: "upi",
    provider: "phonepe",
    icon: "📞",
    enabled: true,
    processingFee: 0.5,
    description: "PhonePe UPI payments",
    supportedCurrencies: ["INR"],
  },
  {
    id: "googlepay-upi",
    name: "Google Pay",
    type: "upi",
    provider: "googlepay",
    icon: "🔍",
    enabled: true,
    processingFee: 0.5,
    description: "Google Pay UPI",
    supportedCurrencies: ["INR"],
  },
  {
    id: "amazonpay-wallet",
    name: "Amazon Pay",
    type: "wallet",
    provider: "amazonpay",
    icon: "📦",
    enabled: true,
    processingFee: 1.2,
    description: "Amazon Pay wallet",
    supportedCurrencies: ["INR"],
  },
  {
    id: "simpl-bnpl",
    name: "Buy Now Pay Later",
    type: "bnpl",
    provider: "simpl",
    icon: "⏰",
    enabled: true,
    processingFee: 2,
    description: "3 installments, no interest",
    supportedCurrencies: ["INR"],
  },
]

function toMethodRecord(method: PaymentMethod): Omit<PaymentMethodRecord, "createdAt" | "updatedAt"> {
  return {
    id: method.id,
    name: method.name,
    type: method.type,
    provider: method.provider,
    icon: method.icon,
    enabled: method.enabled,
    processingFee: method.processingFee,
    description: method.description,
    supportedCurrencies: method.supportedCurrencies,
  }
}

function toPublicMethod(record: PaymentMethodRecord): PaymentMethod {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    provider: record.provider,
    icon: record.icon,
    enabled: record.enabled,
    processingFee: record.processingFee,
    description: record.description,
    supportedCurrencies: record.supportedCurrencies,
  }
}

export class PaymentService {
  private static methodsSeeded = false

  private static async ensurePaymentMethodsSeeded() {
    if (this.methodsSeeded) return

    for (const method of DEFAULT_PAYMENT_METHODS) {
      await createPaymentMethodRecord(toMethodRecord(method))
    }

    this.methodsSeeded = true
  }

  private static async getPaymentMethodOrThrow(paymentMethodId: string) {
    await this.ensurePaymentMethodsSeeded()
    const paymentMethod = await findPaymentMethodById(paymentMethodId)
    if (!paymentMethod || !paymentMethod.enabled) {
      throw new Error("Payment method not found")
    }

    return paymentMethod
  }

  static async getPaymentMethods(currency = "INR"): Promise<PaymentMethod[]> {
    await this.ensurePaymentMethodsSeeded()
    const methods = await listEnabledPaymentMethods(currency)
    return methods.map(toPublicMethod)
  }

  static async createPaymentIntent(
    amount: number,
    currency: string,
    paymentMethodId: string,
    metadata: Record<string, any> = {},
    idempotencyKey?: string,
  ): Promise<PaymentIntent> {
    const paymentMethod = await this.getPaymentMethodOrThrow(paymentMethodId)

    const createKey = idempotencyKey ?? buildCreateIdempotencyKey({ paymentMethodId, currency, amount, metadata })
    const existing = await getPaymentIntentByCreateIdempotencyKey(createKey)
    if (existing) return toPublicIntent(existing)

    const intentId = createEntityId("pi")
    const providerAdapter = getProviderAdapter(paymentMethod.provider)
    const providerIntent = await providerAdapter.createIntent({
      intentId,
      amount,
      currency,
      paymentMethod,
      metadata,
    })

    const persisted = await createPaymentIntentRecord({
      id: intentId,
      amount,
      currency,
      paymentMethodId,
      provider: paymentMethod.provider,
      providerIntentId: providerIntent.providerIntentId,
      createIdempotencyKey: createKey,
      metadata,
      providerEvents: [providerIntent.event],
    })

    return toPublicIntent(persisted)
  }

  static async processPayment(intentId: string, idempotencyKey?: string): Promise<PaymentTransaction> {
    const persistedIntent = await getPaymentIntentById(intentId)
    if (!persistedIntent) {
      throw new Error("Payment intent not found")
    }

    const paymentMethod = await this.getPaymentMethodOrThrow(persistedIntent.paymentMethodId)

    const confirmKey = idempotencyKey ?? `confirm:${intentId}`
    const existingByKey = await getPaymentTransactionByConfirmIdempotencyKey(confirmKey)
    if (existingByKey) return toPublicTransaction(existingByKey)

    const existingByIntent = await getPaymentTransactionByIntentId(intentId)
    if (existingByIntent) return toPublicTransaction(existingByIntent)

    await updatePaymentIntentStatus({ id: intentId, status: "processing" })

    const processingFee = (persistedIntent.amount * paymentMethod.processingFee) / 100
    const providerAdapter = getProviderAdapter(paymentMethod.provider)
    const providerResult = await providerAdapter.confirmPayment({
      intentId,
      providerIntentId: persistedIntent.providerIntentId ?? `${paymentMethod.provider}_pi_${intentId}`,
      amount: persistedIntent.amount,
      currency: persistedIntent.currency,
      paymentMethod,
      metadata: persistedIntent.metadata,
    })

    const status = statusFromProviderEvent({
      event: providerResult.event,
      providerStatus: providerResult.providerStatus,
      fallbackStatus: providerResult.status,
    })

    const transaction = await createPaymentTransactionRecord({
      id: createEntityId("txn"),
      intentId,
      amount: persistedIntent.amount,
      currency: persistedIntent.currency,
      status,
      paymentMethod: paymentMethod.name,
      provider: paymentMethod.provider,
      providerTransactionId: providerResult.providerTransactionId,
      providerStatus: providerResult.providerStatus,
      processingFee,
      netAmount: status === "completed" ? persistedIntent.amount - processingFee : 0,
      failureReason: status === "failed" ? providerResult.failureReason ?? "Provider declined payment" : null,
      confirmIdempotencyKey: confirmKey,
      metadata: persistedIntent.metadata,
      providerEvents: [providerResult.event],
    })

    await updatePaymentIntentStatus({
      id: intentId,
      status: intentStatusFromTransactionStatus(status),
      providerEvent: providerResult.event,
    })

    return toPublicTransaction(transaction)
  }

  static async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const record = await getPaymentTransactionById(transactionId)
    return record ? toPublicTransaction(record) : null
  }

  static async refundTransaction(transactionId: string, amount: number, reason: string): Promise<PaymentTransaction> {
    const transaction = await getPaymentTransactionById(transactionId)
    if (!transaction) {
      throw new Error("Transaction not found")
    }

    if (transaction.status !== "completed") {
      throw new Error("Cannot refund non-completed transaction")
    }

    await createPaymentRefundRecord({
      id: createEntityId("rfnd"),
      transactionId,
      amount,
      reason,
      status: "succeeded",
      metadata: { provider: transaction.provider },
    })

    const updated = await updatePaymentTransaction({
      id: transactionId,
      status: "refunded",
      providerStatus: "refunded",
      refundAmount: amount,
      refundReason: reason,
      providerEvent: {
        provider: transaction.provider,
        type: "refund.succeeded",
        amount,
      },
    })

    if (!updated) {
      throw new Error("Failed to update refunded transaction")
    }

    await updatePaymentIntentStatus({
      id: updated.intentId,
      status: "succeeded",
      providerEvent: { provider: updated.provider, type: "intent.refunded", amount },
    })

    return toPublicTransaction(updated)
  }

  static async getAnalytics(): Promise<PaymentAnalytics> {
    const transactions = await listRecentPaymentTransactions(250)
    const completedTransactions = transactions.filter((transaction) => transaction.status === "completed")
    const totalRevenue = completedTransactions.reduce((sum, transaction) => sum + transaction.netAmount, 0)
    const totalTransactions = transactions.length
    const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0
    const averageTransactionValue = completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0

    const methodCounts = completedTransactions.reduce(
      (acc, transaction) => {
        acc[transaction.paymentMethod] = (acc[transaction.paymentMethod] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const topPaymentMethods = Object.entries(methodCounts)
      .map(([method, count]) => ({
        method,
        count,
        percentage: completedTransactions.length > 0 ? (count / completedTransactions.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const monthlyTrends = await getPaymentTransactionMonthlyTrends(6)

    const lifecycle = await getLifecycleSnapshot()

    return {
      lifecycle,
      totalRevenue,
      totalTransactions,
      successRate,
      averageTransactionValue,
      topPaymentMethods,
      monthlyTrends,
      recentTransactions: transactions.slice(0, 10).map(toPublicTransaction),
    }
  }

  static calculateProcessingFee(amount: number, paymentMethodId: string): number {
    const method = DEFAULT_PAYMENT_METHODS.find((item) => item.id === paymentMethodId)
    return method ? (amount * method.processingFee) / 100 : 0
  }

  static async validatePaymentMethod(paymentMethodId: string, currency: string): Promise<boolean> {
    await this.ensurePaymentMethodsSeeded()
    const method = await findPaymentMethodById(paymentMethodId)
    return method ? method.enabled && method.supportedCurrencies.includes(currency) : false
  }

  static async getRefundsForTransaction(transactionId: string) {
    return listRefundsByTransactionId(transactionId)
  }
}
