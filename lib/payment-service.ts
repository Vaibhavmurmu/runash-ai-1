import {
  createPaymentIntentRecord,
  getPaymentIntentByCreateIdempotencyKey,
  getPaymentIntentById,
  type PaymentIntentStatus,
  updatePaymentIntentStatus,
} from "@/lib/repositories/payment-intents"
import {
  createPaymentRefundRecord,
  listRefundsByTransactionId,
} from "@/lib/repositories/payment-refunds"
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
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function intentStatusFromTransactionStatus(status: PaymentTransaction["status"]): PaymentIntentStatus {
  if (status === "completed" || status === "refunded") return "succeeded"
  if (status === "failed") return "failed"
  return "processing"
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

export class PaymentService {
  private static paymentMethods: PaymentMethod[] = [
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

  static async getPaymentMethods(currency = "INR"): Promise<PaymentMethod[]> {
    return this.paymentMethods.filter((method) => method.enabled && method.supportedCurrencies.includes(currency))
  }

  static async createPaymentIntent(
    amount: number,
    currency: string,
    paymentMethodId: string,
    metadata: Record<string, any> = {},
    idempotencyKey?: string,
  ): Promise<PaymentIntent> {
    const paymentMethod = this.paymentMethods.find((method) => method.id === paymentMethodId)
    if (!paymentMethod) throw new Error("Payment method not found")

    const createKey = idempotencyKey ?? `create:${paymentMethodId}:${currency}:${amount}:${JSON.stringify(metadata)}`
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

    const paymentMethod = this.paymentMethods.find((method) => method.id === persistedIntent.paymentMethodId)
    if (!paymentMethod) {
      throw new Error("Payment method not found")
    }

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

    const status = providerResult.status
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
      failureReason: providerResult.failureReason,
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

    return {
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
    const method = this.paymentMethods.find((method) => method.id === paymentMethodId)
    return method ? (amount * method.processingFee) / 100 : 0
  }

  static async validatePaymentMethod(paymentMethodId: string, currency: string): Promise<boolean> {
    const method = this.paymentMethods.find((item) => item.id === paymentMethodId)
    return method ? method.enabled && method.supportedCurrencies.includes(currency) : false
  }

  static async getRefundsForTransaction(transactionId: string) {
    return listRefundsByTransactionId(transactionId)
  }
}
