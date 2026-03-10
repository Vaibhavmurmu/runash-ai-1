import { createHash } from "crypto"

export type UpiExecutionStatus = "initiated" | "pending" | "success" | "failed"
export type UpiErrorCode = "INVALID_PIN" | "PIN_ATTEMPTS_EXCEEDED" | "RISK_BLOCKED"

type UpiTransactionRecord = {
  transactionId: string
  userId: string
  payerUpiId: string
  createdAtEpoch: number
  amount: number
  currency: string
  status: UpiExecutionStatus
  transactionReference: string
  pinHash: string
  pinAttempts: number
  maxPinAttempts: number
  executionStartedAt?: number
  failureReason?: string
  failureCode?: UpiErrorCode
  confirmationResultByIdempotencyKey: Map<string, UpiConfirmationResult>
}

type UpiInitiationResult = {
  transactionId: string
  userId: string
  payerUpiId: string
  amount: number
  currency: string
  status: "initiated"
  initiatedAt: string
  idempotencyKey: string
}

type UpiConfirmationSuccess = {
  ok: true
  transactionId: string
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

const transactionsById = new Map<string, UpiTransactionRecord>()
const initiationByIdempotencyKey = new Map<string, UpiInitiationResult>()
const completionResultByIdempotencyKey = new Map<string, UpiCompletionResult>()

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
  static initiatePayment(input: { idempotencyKey: string; amount: number; payerUpiId: string; userId: string }): UpiInitiationResult {
    const { idempotencyKey, amount, payerUpiId, userId } = input
    const existing = initiationByIdempotencyKey.get(idempotencyKey)
    if (existing) {
      return existing
    }

    const transactionId = buildTransactionId()
    const createdAtEpoch = parseTimestamp(transactionId)

    const transaction: UpiTransactionRecord = {
      transactionId,
      userId,
      payerUpiId,
      createdAtEpoch,
      amount,
      currency: DEFAULT_CURRENCY,
      status: "initiated",
      transactionReference: toReference(transactionId),
      pinHash: hashPin(DEMO_UPI_PIN),
      pinAttempts: 0,
      maxPinAttempts: MAX_PIN_ATTEMPTS,
      confirmationResultByIdempotencyKey: new Map(),
    }

    transactionsById.set(transactionId, transaction)

    const result: UpiInitiationResult = {
      transactionId,
      userId,
      payerUpiId,
      amount,
      currency: DEFAULT_CURRENCY,
      status: "initiated",
      initiatedAt: new Date(createdAtEpoch).toISOString(),
      idempotencyKey,
    }

    initiationByIdempotencyKey.set(idempotencyKey, result)
    return result
  }

  static confirmPayment(input: {
    transactionId: string
    pin: string
    idempotencyKey: string
    userId: string
  }): UpiConfirmationResult {
    const transaction = transactionsById.get(input.transactionId)

    if (!transaction) {
      return {
        ok: false,
        status: "failed",
        code: "RISK_BLOCKED",
        error: "Transaction is not available for confirmation.",
        attemptsRemaining: 0,
      }
    }

    if (transaction.userId !== input.userId) {
      return {
        ok: false,
        status: "failed",
        code: "RISK_BLOCKED",
        error: "Transaction ownership mismatch.",
        attemptsRemaining: 0,
      }
    }

    const idemResult = transaction.confirmationResultByIdempotencyKey.get(input.idempotencyKey)
    if (idemResult) {
      return idemResult
    }

    if (transaction.pinAttempts >= transaction.maxPinAttempts) {
      const blockedResult: UpiConfirmationFailure = {
        ok: false,
        status: "failed",
        code: "PIN_ATTEMPTS_EXCEEDED",
        error: "PIN attempts exceeded. Please restart the payment.",
        attemptsRemaining: 0,
      }
      transaction.status = "failed"
      transaction.failureCode = blockedResult.code
      transaction.failureReason = blockedResult.error
      transaction.confirmationResultByIdempotencyKey.set(input.idempotencyKey, blockedResult)
      return blockedResult
    }

    const sanitizedPinForLogs = assertMaskedPin(input.pin)
    void sanitizedPinForLogs

    if (!/^\d{4,6}$/.test(input.pin) || hashPin(input.pin) !== transaction.pinHash) {
      transaction.pinAttempts += 1
      const attemptsRemaining = Math.max(0, transaction.maxPinAttempts - transaction.pinAttempts)

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

      if (attemptsRemaining === 0) {
        transaction.status = "failed"
        transaction.failureCode = invalidResult.code
        transaction.failureReason = invalidResult.error
      }

      transaction.confirmationResultByIdempotencyKey.set(input.idempotencyKey, invalidResult)
      return invalidResult
    }

    transaction.status = "pending"

    if (!transaction.executionStartedAt) {
      transaction.executionStartedAt = Date.now()
      setTimeout(() => {
        const current = transactionsById.get(input.transactionId)
        if (!current || current.status !== "pending") return
        const terminal = resolveTerminalStatus(current.transactionId)
        current.status = terminal
        if (terminal === "failed") {
          current.failureReason = "UPI provider declined the payment."
        }
      }, EXECUTION_DELAY_MS)
    }

    const successResult: UpiConfirmationSuccess = {
      ok: true,
      transactionId: transaction.transactionId,
      status: transaction.status,
      transactionReference: transaction.transactionReference,
      updatedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }

    transaction.confirmationResultByIdempotencyKey.set(input.idempotencyKey, successResult)
    return successResult
  }

  static getStatus(transactionId: string) {
    const transaction = transactionsById.get(transactionId)

    if (!transaction) {
      return {
        found: false as const,
        payload: {
          transactionId,
          userId: null,
          payerUpiId: null,
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

    const elapsedMs = Date.now() - transaction.createdAtEpoch
    if (elapsedMs > 45_000 && transaction.status === "pending") {
      transaction.status = "failed"
      transaction.failureReason = "UPI provider timeout."
    }

    return {
      found: true as const,
      payload: {
        transactionId: transaction.transactionId,
        userId: transaction.userId,
        payerUpiId: transaction.payerUpiId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        transactionReference: transaction.transactionReference,
        updatedAt: new Date().toISOString(),
        ...(transaction.failureReason ? { failedReason: transaction.failureReason } : {}),
        ...(transaction.failureCode ? { errorCode: transaction.failureCode } : {}),
      },
    }
  }

  static completeViaProvider(input: { transactionId: string; idempotencyKey: string; userId: string }): UpiCompletionResult {
    const existing = completionResultByIdempotencyKey.get(input.idempotencyKey)
    if (existing) {
      return existing
    }

    const transaction = transactionsById.get(input.transactionId)

    if (!transaction) {
      const result = {
        ok: false as const,
        error: "Transaction not found",
        errorCode: "RISK_BLOCKED" as UpiErrorCode,
      }
      completionResultByIdempotencyKey.set(input.idempotencyKey, result)
      return result
    }

    if (transaction.userId !== input.userId) {
      const result = {
        ok: false as const,
        error: "Transaction ownership mismatch.",
        errorCode: "RISK_BLOCKED" as UpiErrorCode,
      }
      completionResultByIdempotencyKey.set(input.idempotencyKey, result)
      return result
    }

    if (transaction.status === "success") {
      const result = {
        ok: true as const,
        transactionId: transaction.transactionId,
        status: transaction.status,
        transactionReference: transaction.transactionReference,
        updatedAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
      }
      completionResultByIdempotencyKey.set(input.idempotencyKey, result)
      return result
    }

    if (transaction.status === "failed") {
      const result = {
        ok: false as const,
        error: transaction.failureReason || "Transaction failed",
        errorCode: transaction.failureCode || ("RISK_BLOCKED" as UpiErrorCode),
      }
      completionResultByIdempotencyKey.set(input.idempotencyKey, result)
      return result
    }

    transaction.status = "success"
    transaction.failureCode = undefined
    transaction.failureReason = undefined

    const result = {
      ok: true as const,
      transactionId: transaction.transactionId,
      status: transaction.status,
      transactionReference: transaction.transactionReference,
      updatedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }

    completionResultByIdempotencyKey.set(input.idempotencyKey, result)
    return result
  }

  static getTransactionDetails(transactionId: string) {
    const status = UpiCheckoutService.getStatus(transactionId)

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
