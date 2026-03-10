import { createHash } from "crypto"

export type UpiExecutionStatus = "initiated" | "pending" | "success" | "failed"
export type UpiErrorCode = "INVALID_PIN" | "PIN_ATTEMPTS_EXCEEDED" | "RISK_BLOCKED"
export type UpiProviderStatus = "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | "AUTHORIZED" | "TIMEOUT"

type UpiTransactionRecord = {
  transactionId: string
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
  verifiedAt?: string
  verifiedBy?: "provider_callback" | "sandbox_complete"
  providerStatus?: UpiProviderStatus
  providerReference?: string
  providerEventId?: string
  orderId: string
  confirmationResultByIdempotencyKey: Map<string, UpiConfirmationResult>
}

type UpiOrderRecord = {
  orderId: string
  transactionId: string
  amount: number
  currency: string
  status: UpiExecutionStatus
  updatedAt: string
}

type UpiInitiationResult = {
  transactionId: string
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

const transactionsById = new Map<string, UpiTransactionRecord>()
const initiationByIdempotencyKey = new Map<string, UpiInitiationResult>()
const orderByOrderId = new Map<string, UpiOrderRecord>()
const processedProviderEvents = new Set<string>()

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

function toCanonicalStatus(providerStatus: UpiProviderStatus): UpiExecutionStatus {
  switch (providerStatus) {
    case "SUCCESS":
      return "success"
    case "FAILED":
    case "TIMEOUT":
      return "failed"
    case "PENDING":
    case "PROCESSING":
    case "AUTHORIZED":
      return "pending"
    default:
      return "pending"
  }
}

function syncOrderRecord(transaction: UpiTransactionRecord) {
  orderByOrderId.set(transaction.orderId, {
    orderId: transaction.orderId,
    transactionId: transaction.transactionId,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    updatedAt: new Date().toISOString(),
  })
}

export class UpiCheckoutService {
  static initiatePayment(idempotencyKey: string, amount: number, orderId?: string): UpiInitiationResult {
    const existing = initiationByIdempotencyKey.get(idempotencyKey)
    if (existing) {
      return existing
    }

    const transactionId = buildTransactionId()
    const createdAtEpoch = parseTimestamp(transactionId)

    const transaction: UpiTransactionRecord = {
      transactionId,
      createdAtEpoch,
      amount,
      currency: DEFAULT_CURRENCY,
      status: "initiated",
      transactionReference: toReference(transactionId),
      pinHash: hashPin(DEMO_UPI_PIN),
      pinAttempts: 0,
      maxPinAttempts: MAX_PIN_ATTEMPTS,
      orderId: orderId?.trim() || `order_${transactionId}`,
      confirmationResultByIdempotencyKey: new Map(),
    }

    transactionsById.set(transactionId, transaction)

    const result: UpiInitiationResult = {
      transactionId,
      amount,
      currency: DEFAULT_CURRENCY,
      status: "initiated",
      initiatedAt: new Date(createdAtEpoch).toISOString(),
      idempotencyKey,
    }

    initiationByIdempotencyKey.set(idempotencyKey, result)
    syncOrderRecord(transaction)
    return result
  }

  static confirmPayment(input: {
    transactionId: string
    pin: string
    idempotencyKey: string
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
      syncOrderRecord(transaction)
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
      syncOrderRecord(transaction)
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
        syncOrderRecord(current)
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
    syncOrderRecord(transaction)
    return successResult
  }

  static getStatus(transactionId: string) {
    const transaction = transactionsById.get(transactionId)

    if (!transaction) {
      return {
        found: false as const,
        payload: {
          transactionId,
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
      syncOrderRecord(transaction)
    }

    return {
      found: true as const,
      payload: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        transactionReference: transaction.transactionReference,
        updatedAt: new Date().toISOString(),
        ...(transaction.failureReason ? { failedReason: transaction.failureReason } : {}),
        ...(transaction.failureCode ? { errorCode: transaction.failureCode } : {}),
        ...(transaction.verifiedAt ? { verifiedAt: transaction.verifiedAt } : {}),
        ...(transaction.verifiedBy ? { verifiedBy: transaction.verifiedBy } : {}),
        isVerified: Boolean(transaction.verifiedAt),
      },
    }
  }

  static applyProviderCallback(input: {
    transactionId: string
    providerStatus: UpiProviderStatus
    providerReference?: string
    providerEventId?: string
  }) {
    const transaction = transactionsById.get(input.transactionId)
    if (!transaction) {
      return {
        ok: false as const,
        error: "Transaction not found",
      }
    }

    if (input.providerEventId && processedProviderEvents.has(input.providerEventId)) {
      return {
        ok: true as const,
        idempotent: true as const,
        transactionId: transaction.transactionId,
        status: transaction.status,
        orderId: transaction.orderId,
      }
    }

    transaction.providerStatus = input.providerStatus
    transaction.providerReference = input.providerReference
    transaction.providerEventId = input.providerEventId
    transaction.status = toCanonicalStatus(input.providerStatus)
    transaction.verifiedAt = new Date().toISOString()
    transaction.verifiedBy = "provider_callback"

    if (transaction.status === "failed") {
      transaction.failureReason = "UPI provider reported a terminal failure."
      transaction.failureCode = "RISK_BLOCKED"
    } else {
      transaction.failureReason = undefined
      transaction.failureCode = undefined
    }

    if (input.providerEventId) {
      processedProviderEvents.add(input.providerEventId)
    }

    syncOrderRecord(transaction)

    return {
      ok: true as const,
      idempotent: false as const,
      transactionId: transaction.transactionId,
      status: transaction.status,
      orderId: transaction.orderId,
      verifiedAt: transaction.verifiedAt,
      verifiedBy: transaction.verifiedBy,
    }
  }

  static completeViaProvider(input: { transactionId: string; idempotencyKey: string }) {
    const transaction = transactionsById.get(input.transactionId)

    if (!transaction) {
      return {
        ok: false as const,
        error: "Transaction not found",
        errorCode: "RISK_BLOCKED" as UpiErrorCode,
      }
    }

    if (transaction.status === "success") {
      return {
        ok: true as const,
        transactionId: transaction.transactionId,
        status: transaction.status,
        transactionReference: transaction.transactionReference,
        updatedAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
      }
    }

    if (transaction.status === "failed") {
      return {
        ok: false as const,
        error: transaction.failureReason || "Transaction failed",
        errorCode: transaction.failureCode || ("RISK_BLOCKED" as UpiErrorCode),
      }
    }

    transaction.status = "success"
    transaction.verifiedAt = new Date().toISOString()
    transaction.verifiedBy = "sandbox_complete"
    transaction.failureCode = undefined
    transaction.failureReason = undefined
    syncOrderRecord(transaction)

    return {
      ok: true as const,
      transactionId: transaction.transactionId,
      status: transaction.status,
      transactionReference: transaction.transactionReference,
      updatedAt: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }
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

  static getOrderRecord(orderId: string) {
    return orderByOrderId.get(orderId) ?? null
  }
}
