import { createHash } from "crypto"
import {
  appendUpiTransactionEvent,
  createUpiTransaction,
  getUpiConfirmationResult,
  getUpiTransactionById,
  getUpiTransactionByInitiationIdempotencyKey,
  type UpiErrorCode,
  type UpiExecutionStatus,
  updateUpiTransaction,
} from "@/lib/repositories/upi-transactions"

export type { UpiExecutionStatus, UpiErrorCode }

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

const DEMO_UPI_PIN = "123456"
const MAX_PIN_ATTEMPTS = 3
const EXECUTION_DELAY_MS = 6_000
const DEFAULT_CURRENCY = "INR"

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex")
}

function buildTransactionId() {
  return `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function parseTimestamp(transactionId: string) {
  const parts = transactionId.split("-")
  const epoch = Number(parts[1])
  return Number.isFinite(epoch) ? epoch : Date.now()
}

function toReference(transactionId: string): string {
  return `REF-${transactionId.slice(-10).toUpperCase()}`
}

function resolveTerminalStatus(transactionId: string): "success" | "failed" {
  const checksum = transactionId
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return checksum % 11 === 0 ? "failed" : "success"
}

function assertMaskedPin(_pin: string) {
  return "[REDACTED_PIN]"
}

export class UpiCheckoutService {
  static async initiatePayment(idempotencyKey: string, amount: number): Promise<UpiInitiationResult> {
    const existing = await getUpiTransactionByInitiationIdempotencyKey(idempotencyKey)
    if (existing) {
      return {
        transactionId: existing.transactionId,
        amount: existing.amount,
        currency: existing.currency,
        status: "initiated",
        initiatedAt: existing.createdAt.toISOString(),
        idempotencyKey,
      }
    }

    const [order] = await sqlClient /* sql */`
      UPDATE public.orders
      SET status = CASE
        WHEN status = 'paid' THEN status
        ELSE 'payment_pending'
      END,
      row_version = row_version + 1,
      updated_at = now()
      WHERE id = ${orderId}
      RETURNING id
    `

    if (!order) {
      throw new Error("Order not found for UPI initiation")
    }

    const transactionId = buildTransactionId()
    const createdAtEpoch = parseTimestamp(transactionId)
    const transaction = await createUpiTransaction({
      transactionId,
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
      payload: {
        amount,
        currency: DEFAULT_CURRENCY,
      },
    })

    return {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: "initiated",
      initiatedAt: new Date(createdAtEpoch).toISOString(),
      idempotencyKey,
    }
  }

  static async confirmPayment(input: {
    transactionId: string
    pin: string
    idempotencyKey: string
  }): Promise<UpiConfirmationResult> {
    const transaction = await getUpiTransactionById(input.transactionId)

    if (!transaction) {
      return {
        ok: false,
        status: "failed",
        code: "RISK_BLOCKED",
        error: "Transaction is not available for confirmation.",
        attemptsRemaining: 0,
      }
    }

    const idemResult = await getUpiConfirmationResult(input.transactionId, input.idempotencyKey)
    if (idemResult) {
      return idemResult as UpiConfirmationResult
    }

    if (transaction.pinAttempts >= transaction.maxPinAttempts) {
      const blockedResult: UpiConfirmationFailure = {
        ok: false,
        status: "failed",
        code: "PIN_ATTEMPTS_EXCEEDED",
        error: "PIN attempts exceeded. Please restart the payment.",
        attemptsRemaining: 0,
      }

      await updateUpiTransaction({
        transactionId: input.transactionId,
        status: "failed",
        failureCode: blockedResult.code,
        failureReason: blockedResult.error,
      })

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

    const sanitizedPinForLogs = assertMaskedPin(input.pin)
    void sanitizedPinForLogs

    if (!/^\d{4,6}$/.test(input.pin) || hashPin(input.pin) !== transaction.pinHash) {
      const pinAttempts = transaction.pinAttempts + 1
      const attemptsRemaining = Math.max(0, transaction.maxPinAttempts - pinAttempts)

      const invalidResult: UpiConfirmationFailure = {
        ok: false,
        status: "failed",
        code: attemptsRemaining === 0 ? "PIN_ATTEMPTS_EXCEEDED" : "INVALID_PIN",
        error:
          attemptsRemaining === 0
            ? "PIN attempts exceeded. Please restart the payment."
            : "The PIN entered is invalid.",
        attemptsRemaining,
      }

      await updateUpiTransaction({
        transactionId: input.transactionId,
        status: attemptsRemaining === 0 ? "failed" : transaction.status,
        pinAttempts,
        failureCode: attemptsRemaining === 0 ? invalidResult.code : null,
        failureReason: attemptsRemaining === 0 ? invalidResult.error : null,
      })

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

    const pending = await updateUpiTransaction({
      transactionId: input.transactionId,
      status: "pending",
      executionStartedAt: transaction.executionStartedAt ? null : new Date(),
      failureCode: null,
      failureReason: null,
    })

    setTimeout(() => {
      void UpiCheckoutService.completeViaProvider({
        transactionId: input.transactionId,
        idempotencyKey: `provider-complete:${input.transactionId}`,
      })
    }, EXECUTION_DELAY_MS)

    const successResult: UpiConfirmationSuccess = {
      ok: true,
      transactionId: transaction.transactionId,
      status: pending?.status ?? "pending",
      transactionReference: transaction.transactionReference,
      updatedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }

    await appendUpiTransactionEvent({
      transactionId: input.transactionId,
      eventType: "confirmation_result",
      idempotencyKey: input.idempotencyKey,
      status: successResult.status,
      payload: successResult,
    })

    return successResult
  }

  static async completeViaProvider(input: {
    transactionId: string
    idempotencyKey: string
    providerReference?: string
    providerStatusReference?: string
    status?: "success" | "failed"
    failureReason?: string
    failureCode?: UpiErrorCode
  }) {
    const transaction = await getUpiTransactionById(input.transactionId)
    if (!transaction || transaction.status !== "pending") return null

    const terminalStatus = input.status ?? resolveTerminalStatus(transaction.transactionId)
    const failureReason =
      terminalStatus === "failed" ? input.failureReason ?? "UPI provider declined the payment." : null

    const updated = await updateUpiTransaction({
      transactionId: input.transactionId,
      status: terminalStatus,
      providerReference: input.providerReference ?? transaction.providerReference,
      providerStatusReference: input.providerStatusReference ?? transaction.providerStatusReference,
      failureCode: terminalStatus === "failed" ? input.failureCode ?? null : null,
      failureReason,
    })

    await appendUpiTransactionEvent({
      transactionId: input.transactionId,
      eventType: "provider_completion",
      idempotencyKey: input.idempotencyKey,
      status: terminalStatus,
      providerReference: input.providerReference,
      providerStatusReference: input.providerStatusReference,
      failureCode: terminalStatus === "failed" ? input.failureCode ?? null : null,
      failureReason,
      payload: {
        transactionId: input.transactionId,
        status: terminalStatus,
      },
    })

    return updated
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
        },
      }
    }

    const elapsedMs = Date.now() - transaction.createdAt.getTime()
    if (elapsedMs > 45_000 && transaction.status === "pending") {
      await updateUpiTransaction({
        transactionId,
        status: "failed",
        failureReason: "UPI provider timeout.",
      })
    }

    const latest = (await getUpiTransactionById(transactionId)) ?? transaction

    return {
      found: true as const,
      payload: {
        transactionId: latest.transactionId,
        amount: latest.amount,
        currency: latest.currency,
        status: latest.status,
        transactionReference: latest.transactionReference,
        updatedAt: new Date().toISOString(),
        ...(latest.failureReason ? { failedReason: latest.failureReason } : {}),
        ...(latest.failureCode ? { errorCode: latest.failureCode } : {}),
      },
    }
  }

  static async completeViaProvider(input: { transactionId: string; idempotencyKey: string }, sqlClient: SqlClient = getSql()) {
    const transaction = transactionsById.get(input.transactionId)

    if (!transaction) {
      return {
        ok: false as const,
        error: "Transaction not found",
        errorCode: "RISK_BLOCKED" as UpiErrorCode,
      }
    }

    if (transaction.status === "success") {
      await UpiCheckoutService.updateOrderPaymentStatus(transaction, sqlClient)
      return {
        ok: true as const,
        transactionId: transaction.transactionId,
        order_id: transaction.orderId,
        status: transaction.status,
        transactionReference: transaction.transactionReference,
        updatedAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
      }
    }

    if (transaction.status === "failed") {
      await UpiCheckoutService.updateOrderPaymentStatus(transaction, sqlClient)
      return {
        ok: false as const,
        error: transaction.failureReason || "Transaction failed",
        errorCode: transaction.failureCode || ("RISK_BLOCKED" as UpiErrorCode),
      }
    }

    transaction.status = "success"
    transaction.failureCode = undefined
    transaction.failureReason = undefined

    await UpiCheckoutService.updateOrderPaymentStatus(transaction, sqlClient)

    return {
      ok: true as const,
      transactionId: transaction.transactionId,
      order_id: transaction.orderId,
      status: transaction.status,
      transactionReference: transaction.transactionReference,
      updatedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }
  }

  static async getTransactionDetails(transactionId: string, sqlClient: SqlClient = getSql()) {
    const status = await UpiCheckoutService.getStatus(transactionId, sqlClient)

    if (!status.found) {
      return {
        found: false as const,
        payload: {
          ...status.payload,
          receiptId: `RCPT-${transactionId}`,
        },
      }
    }

    return {
      found: true as const,
      payload: {
        ...status.payload,
        receiptId: `RCPT-${status.payload.transactionReference}`,
      },
    }
  }
}
