import { createHash } from "crypto"
import {
  appendUpiTransactionEvent,
  createUpiTransaction,
  getUpiConfirmationResult,
  getUpiProviderCompletionResult,
  getUpiTransactionById,
  getUpiTransactionByInitiationIdempotencyKey,
  type UpiErrorCode,
  type UpiExecutionStatus,
} from "@/lib/repositories/upi-transactions"

export type { UpiExecutionStatus, UpiErrorCode }
export type UpiProviderStatus = "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | "AUTHORIZED" | "TIMEOUT"

type UpiInitiationResult = {
  transactionId: string
  order_id: number
  amount: number
  currency: string
  status: "initiated"
  initiatedAt: string
  idempotencyKey: string
}

type UpiConfirmationSuccess = {
  ok: true
  transactionId: string
  order_id: number
  status: UpiExecutionStatus
  transactionReference: string
  updatedAt: string
  idempotencyKey: string
}

type UpiConfirmationFailure = {
  ok: false
  status: "failed"
  code: UpiErrorCode
  error: string
  attemptsRemaining: number
}

type UpiConfirmationResult = UpiConfirmationSuccess | UpiConfirmationFailure

type UpiCompletionResult =
  | {
      ok: true
      transactionId: string
      status: UpiExecutionStatus
      transactionReference: string
      updatedAt: string
      idempotencyKey: string
    }
  | {
      ok: false
      error: string
      errorCode: UpiErrorCode
    }

const DEMO_UPI_PIN = "123456"
const MAX_PIN_ATTEMPTS = 3
const DEFAULT_CURRENCY = "INR"

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex")
}

function buildTransactionId() {
  return `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function toReference(transactionId: string): string {
  return `REF-${transactionId.slice(-10).toUpperCase()}`
}

function resolveTerminalStatus(transactionId: string): "success" | "failed" {
  const checksum = transactionId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return checksum % 11 === 0 ? "failed" : "success"
}

function canonicalProviderStatus(status: UpiProviderStatus): UpiExecutionStatus {
  if (status === "SUCCESS") return "success"
  if (status === "FAILED" || status === "TIMEOUT") return "failed"
  return "pending"
}

export class UpiCheckoutService {
  static async initiatePayment(idempotencyKey: string, amount: number, orderId: number, userId: string): Promise<UpiInitiationResult> {
    const existing = await getUpiTransactionByInitiationIdempotencyKey(idempotencyKey)
    if (existing) {
      return {
        transactionId: existing.transactionId,
        order_id: Number(existing.orderId || orderId),
        amount: existing.amount,
        currency: existing.currency,
        status: "initiated",
        initiatedAt: existing.createdAt.toISOString(),
        idempotencyKey,
      }
    }

    const transactionId = buildTransactionId()
    const transaction = await createUpiTransaction({
      transactionId,
      orderId: String(orderId),
      ownerUserId: userId,
      amount,
      currency: DEFAULT_CURRENCY,
      transactionReference: toReference(transactionId),
      initiationIdempotencyKey: idempotencyKey,
      pinHash: hashPin(DEMO_UPI_PIN),
      maxPinAttempts: MAX_PIN_ATTEMPTS,
    })

    await appendUpiTransactionEvent({
      transactionId,
      eventType: "initiated",
      idempotencyKey,
      status: "initiated",
      payload: { amount, currency: DEFAULT_CURRENCY, orderId, ownerUserId: userId },
    })

    return {
      transactionId: transaction.transactionId,
      order_id: Number(transaction.orderId || orderId),
      amount: transaction.amount,
      currency: transaction.currency,
      status: "initiated",
      initiatedAt: transaction.createdAt.toISOString(),
      idempotencyKey,
    }
  }

  static async confirmPayment(input: { transactionId: string; pin: string; idempotencyKey: string; userId: string }): Promise<UpiConfirmationResult> {
    const transaction = await getUpiTransactionById(input.transactionId)
    if (!transaction || (transaction.ownerUserId && transaction.ownerUserId !== input.userId)) {
      return { ok: false, status: "failed", code: "RISK_BLOCKED", error: "Transaction ownership mismatch.", attemptsRemaining: 0 }
    }

    const idemResult = await getUpiConfirmationResult(input.transactionId, input.idempotencyKey)
    if (idemResult) return idemResult as UpiConfirmationResult

    if (transaction.pinAttempts >= transaction.maxPinAttempts) {
      const blockedResult: UpiConfirmationFailure = {
        ok: false,
        status: "failed",
        code: "PIN_ATTEMPTS_EXCEEDED",
        error: "PIN attempts exceeded. Please restart the payment.",
        attemptsRemaining: 0,
      }
      await appendUpiTransactionEvent({
        transactionId: input.transactionId,
        eventType: "confirmation_result",
        idempotencyKey: input.idempotencyKey,
        status: "failed",
        failureCode: blockedResult.code,
        failureReason: blockedResult.error,
        payload: blockedResult,
      })
      return blockedResult
    }

    if (!/^\d{4,6}$/.test(input.pin) || hashPin(input.pin) !== transaction.pinHash) {
      const attemptsRemaining = Math.max(0, transaction.maxPinAttempts - (transaction.pinAttempts + 1))
      const invalidResult: UpiConfirmationFailure = {
        ok: false,
        status: "failed",
        code: attemptsRemaining === 0 ? "PIN_ATTEMPTS_EXCEEDED" : "INVALID_PIN",
        error: attemptsRemaining === 0 ? "PIN attempts exceeded. Please restart the payment." : "The PIN entered is invalid.",
        attemptsRemaining,
      }
      await appendUpiTransactionEvent({
        transactionId: input.transactionId,
        eventType: "confirmation_result",
        idempotencyKey: input.idempotencyKey,
        status: "failed",
        failureCode: invalidResult.code,
        failureReason: invalidResult.error,
        payload: invalidResult,
      })
      return invalidResult
    }

    const successResult: UpiConfirmationSuccess = {
      ok: true,
      transactionId: transaction.transactionId,
      order_id: Number(transaction.orderId || 0),
      status: "pending",
      transactionReference: transaction.transactionReference,
      updatedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }

    await appendUpiTransactionEvent({
      transactionId: input.transactionId,
      eventType: "confirmation_result",
      idempotencyKey: input.idempotencyKey,
      status: "pending",
      payload: successResult,
    })

    return successResult
  }

  static async completeViaProvider(input: { transactionId: string; idempotencyKey: string; userId: string }): Promise<UpiCompletionResult> {
    const transaction = await getUpiTransactionById(input.transactionId)
    if (!transaction || (transaction.ownerUserId && transaction.ownerUserId !== input.userId)) {
      return { ok: false, error: "Transaction ownership mismatch.", errorCode: "RISK_BLOCKED" }
    }

    const idemResult = await getUpiProviderCompletionResult(input.transactionId, input.idempotencyKey)
    if (idemResult) return idemResult as UpiCompletionResult

    const status = transaction.status === "failed" ? "failed" : resolveTerminalStatus(transaction.transactionId)
    const result: UpiCompletionResult =
      status === "failed"
        ? { ok: false, error: "UPI provider declined the payment.", errorCode: "RISK_BLOCKED" }
        : {
            ok: true,
            transactionId: transaction.transactionId,
            status: "success",
            transactionReference: transaction.transactionReference,
            updatedAt: new Date().toISOString(),
            idempotencyKey: input.idempotencyKey,
          }

    await appendUpiTransactionEvent({
      transactionId: input.transactionId,
      eventType: "provider_completion",
      idempotencyKey: input.idempotencyKey,
      status: status === "failed" ? "failed" : "success",
      failureCode: status === "failed" ? "RISK_BLOCKED" : null,
      failureReason: status === "failed" ? "UPI provider declined the payment." : null,
      payload: result as Record<string, unknown>,
    })

    return result
  }

  static async getStatus(transactionId: string) {
    const transaction = await getUpiTransactionById(transactionId)
    if (!transaction) {
      return {
        found: false as const,
        payload: {
          transactionId,
          order_id: 0,
          amount: 0,
          currency: DEFAULT_CURRENCY,
          status: "failed" as const,
          transactionReference: toReference(transactionId),
          updatedAt: new Date().toISOString(),
          failedReason: "Transaction not found.",
          errorCode: "RISK_BLOCKED" as UpiErrorCode,
          ownerUserId: null,
        },
      }
    }

    return {
      found: true as const,
      payload: {
        transactionId: transaction.transactionId,
        order_id: Number(transaction.orderId || 0),
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        transactionReference: transaction.transactionReference,
        updatedAt: new Date().toISOString(),
        ownerUserId: transaction.ownerUserId,
      },
    }
  }

  static async getTransactionDetails(transactionId: string) {
    const status = await UpiCheckoutService.getStatus(transactionId)
    return {
      found: status.found,
      payload: {
        ...status.payload,
        receiptId: `RCPT-${status.payload.transactionReference}`,
      },
    }
  }

  static async applyProviderCallback(input: {
    transactionId: string
    providerStatus: UpiProviderStatus
    providerReference?: string
    providerEventId?: string
  }) {
    const transaction = await getUpiTransactionById(input.transactionId)
    if (!transaction) {
      return { ok: false as const, error: "Transaction not found" }
    }

    const idempotencyKey = `provider-event:${input.providerEventId || `${input.providerStatus}:${input.providerReference || "na"}`}`
    const previous = await getUpiProviderCompletionResult(input.transactionId, idempotencyKey)
    if (previous) {
      return {
        ok: true as const,
        idempotent: true,
        transactionId: transaction.transactionId,
        orderId: Number(transaction.orderId || 0),
        status: canonicalProviderStatus(input.providerStatus),
        verifiedAt: new Date().toISOString(),
        verifiedBy: "provider_callback",
      }
    }

    const status = canonicalProviderStatus(input.providerStatus)
    await appendUpiTransactionEvent({
      transactionId: input.transactionId,
      eventType: "provider_completion",
      idempotencyKey,
      status,
      providerReference: input.providerReference || null,
      payload: {
        ok: true,
        transactionId: transaction.transactionId,
        orderId: Number(transaction.orderId || 0),
        status,
        verifiedAt: new Date().toISOString(),
        verifiedBy: "provider_callback",
      },
    })

    return {
      ok: true as const,
      idempotent: false,
      transactionId: transaction.transactionId,
      orderId: Number(transaction.orderId || 0),
      status,
      verifiedAt: new Date().toISOString(),
      verifiedBy: "provider_callback",
    }
  }
}
