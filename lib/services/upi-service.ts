import { randomUUID } from "crypto"

import { logApiEvent } from "@/lib/api/logging"
import { neon } from "@/lib/neon/client"
import type { Database, Json } from "@/lib/neon/types"

type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"]
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"]

type GatewayInitiationInput = {
  transactionId: string
  amount: number
  senderId: string
  receiverId: string
}

type GatewayInitiationResult = {
  accepted: boolean
  gatewayTransactionId?: string
  providerRequestId?: string
  rawResponse?: Record<string, unknown>
  failureReason?: string
}

type GatewayWebhookStatus = "SUCCESS" | "FAILED"

type GatewayWebhookInput = {
  transactionId: string
  status: GatewayWebhookStatus
  gatewayTransactionId?: string
  providerRequestId?: string
  failureReason?: string
  rawResponse?: Record<string, unknown>
}

type UpiGatewayProvider = {
  initiatePayment: (input: GatewayInitiationInput) => Promise<GatewayInitiationResult>
}

function getGatewayProvider(): UpiGatewayProvider {
  return {
    async initiatePayment({ transactionId }: GatewayInitiationInput): Promise<GatewayInitiationResult> {
      return {
        accepted: true,
        gatewayTransactionId: `gw_${transactionId}`,
        providerRequestId: `upi_req_${transactionId}`,
        rawResponse: { status: "PENDING", acknowledged: true },
      }
    },
  }
}

function mergeGatewayResponse(existing: Transaction["gateway_response"], updates: Record<string, unknown>): Json {
  const base = typeof existing === "object" && existing !== null ? (existing as Record<string, unknown>) : {}
  return { ...base, ...updates } as Json
}

export class TransactionService {
  static async createTransaction(transaction: TransactionInsert): Promise<{ data: Transaction | null; error: any }> {
    try {
      const transactionId = `TXN${Date.now()}${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`

      const { data, error } = await neon
        .from("transactions")
        .insert({
          ...transaction,
          transaction_id: transactionId,
        })
        .select()
        .single()

      if (error) throw error

      if (data.receiver_id) {
        await this.createTransactionNotification(data)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async getTransactions(userId: string, limit = 50): Promise<{ data: Transaction[] | null; error: any }> {
    try {
      const { data, error } = await neon
        .from("transactions")
        .select(`
          *,
          sender:users!transactions_sender_id_fkey(full_name, phone),
          receiver:users!transactions_receiver_id_fkey(full_name, phone)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateTransactionStatus(
    transactionId: string,
    status: Transaction["status"],
    failureReason?: string,
    gatewayResponsePatch?: Record<string, unknown>,
  ): Promise<{ error: any }> {
    try {
      const updatePayload: TransactionUpdate = {
        status,
      }

      if (failureReason) {
        updatePayload.failure_reason = failureReason
      }

      if (gatewayResponsePatch) {
        const { data: existing } = await neon
          .from("transactions")
          .select("gateway_response")
          .eq("transaction_id", transactionId)
          .single()

        updatePayload.gateway_response = mergeGatewayResponse(existing?.gateway_response ?? null, gatewayResponsePatch)
      }

      const { error } = await neon.from("transactions").update(updatePayload).eq("transaction_id", transactionId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async processPayment(
    senderId: string,
    receiverUpiId: string,
    amount: number,
    note?: string,
  ): Promise<{ data: Transaction | null; error: any }> {
    const requestId = randomUUID()

    try {
      const { data: receiverUpi, error: upiError } = await neon
        .from("upi_ids")
        .select("user_id")
        .eq("upi_id", receiverUpiId)
        .eq("is_active", true)
        .single()

      if (upiError || !receiverUpi) {
        throw new Error("Invalid UPI ID")
      }

      const { data: senderAccount, error: balanceError } = await neon
        .from("bank_accounts")
        .select("balance")
        .eq("user_id", senderId)
        .eq("is_primary", true)
        .single()

      if (balanceError || !senderAccount || senderAccount.balance < amount) {
        throw new Error("Insufficient balance")
      }

      const { data: transaction, error: txnError } = await this.createTransaction({
        sender_id: senderId,
        receiver_id: receiverUpi.user_id,
        amount,
        transaction_type: "SEND",
        status: "PENDING",
        note,
      })

      if (txnError || !transaction) throw txnError

      const gatewayProvider = getGatewayProvider()
      const initiation = await gatewayProvider.initiatePayment({
        transactionId: transaction.transaction_id,
        amount,
        senderId,
        receiverId: receiverUpi.user_id,
      })

      if (!initiation.accepted) {
        await this.updateTransactionStatus(transaction.transaction_id, "FAILED", initiation.failureReason ?? "Payment gateway declined request", {
          providerStatus: "FAILED",
          providerRequestId: initiation.providerRequestId,
          gatewayTransactionId: initiation.gatewayTransactionId,
          lastEvent: "initiation_declined",
          requestId,
          ...(initiation.rawResponse ?? {}),
        })

        logApiEvent("warn", "payments.upi.transaction.failed", {
          route: "services/upi-service",
          requestId,
          details: {
            transactionId: transaction.transaction_id,
            reason: initiation.failureReason ?? "gateway_declined",
            providerRequestId: initiation.providerRequestId ?? null,
          },
        })

        return {
          data: {
            ...transaction,
            status: "FAILED",
            failure_reason: initiation.failureReason ?? "Payment gateway declined request",
            gateway_response: mergeGatewayResponse(transaction.gateway_response, {
              providerStatus: "FAILED",
              providerRequestId: initiation.providerRequestId,
              gatewayTransactionId: initiation.gatewayTransactionId,
              lastEvent: "initiation_declined",
              requestId,
              ...(initiation.rawResponse ?? {}),
            }),
          },
          error: null,
        }
      }

      await this.updateTransactionStatus(transaction.transaction_id, "PENDING", undefined, {
        providerStatus: "PENDING",
        providerRequestId: initiation.providerRequestId,
        gatewayTransactionId: initiation.gatewayTransactionId,
        lastEvent: "gateway_acknowledged",
        requestId,
        ...(initiation.rawResponse ?? {}),
      })

      logApiEvent("info", "payments.upi.transaction.pending", {
        route: "services/upi-service",
        requestId,
        details: {
          transactionId: transaction.transaction_id,
          providerRequestId: initiation.providerRequestId ?? null,
          gatewayTransactionId: initiation.gatewayTransactionId ?? null,
        },
      })

      return {
        data: {
          ...transaction,
          status: "PENDING",
          gateway_transaction_id: initiation.gatewayTransactionId ?? transaction.gateway_transaction_id,
          gateway_response: mergeGatewayResponse(transaction.gateway_response, {
            providerStatus: "PENDING",
            providerRequestId: initiation.providerRequestId,
            gatewayTransactionId: initiation.gatewayTransactionId,
            lastEvent: "gateway_acknowledged",
            requestId,
            ...(initiation.rawResponse ?? {}),
          }),
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async handleGatewayWebhook(payload: GatewayWebhookInput): Promise<{ data: Transaction | null; error: any }> {
    const requestId = randomUUID()

    try {
      const { data: transaction, error: fetchError } = await neon
        .from("transactions")
        .select("*")
        .eq("transaction_id", payload.transactionId)
        .single()

      if (fetchError || !transaction) {
        throw new Error("Transaction not found")
      }

      if (transaction.status === payload.status) {
        logApiEvent("info", "payments.upi.webhook.idempotent", {
          route: "services/upi-service",
          requestId,
          details: {
            transactionId: payload.transactionId,
            status: payload.status,
            providerRequestId: payload.providerRequestId ?? null,
          },
        })
        return { data: transaction, error: null }
      }

      if (transaction.status !== "PENDING") {
        throw new Error(`Invalid transaction transition from ${transaction.status} to ${payload.status}`)
      }

      const gatewayPatch = {
        providerStatus: payload.status,
        providerRequestId: payload.providerRequestId,
        gatewayTransactionId: payload.gatewayTransactionId,
        lastEvent: "webhook",
        requestId,
        ...(payload.rawResponse ?? {}),
      }

      if (payload.status === "SUCCESS") {
        await neon.rpc("transfer_funds", {
          sender_id: transaction.sender_id,
          receiver_id: transaction.receiver_id,
          amount: transaction.amount,
        })
      }

      await this.updateTransactionStatus(
        payload.transactionId,
        payload.status,
        payload.status === "FAILED" ? payload.failureReason ?? "Payment gateway marked transaction as failed" : undefined,
        gatewayPatch,
      )

      const updated: Transaction = {
        ...transaction,
        status: payload.status,
        failure_reason: payload.status === "FAILED" ? payload.failureReason ?? transaction.failure_reason : transaction.failure_reason,
        gateway_transaction_id: payload.gatewayTransactionId ?? transaction.gateway_transaction_id,
        gateway_response: mergeGatewayResponse(transaction.gateway_response, gatewayPatch),
      }

      logApiEvent(payload.status === "SUCCESS" ? "info" : "warn", "payments.upi.webhook.processed", {
        route: "services/upi-service",
        requestId,
        details: {
          transactionId: payload.transactionId,
          status: payload.status,
          providerRequestId: payload.providerRequestId ?? null,
        },
      })

      return { data: updated, error: null }
    } catch (error) {
      logApiEvent("error", "payments.upi.webhook.failed", {
        route: "services/upi-service",
        requestId,
        details: {
          transactionId: payload.transactionId,
          status: payload.status,
          providerRequestId: payload.providerRequestId ?? null,
        },
        error,
      })

      return { data: null, error }
    }
  }

  private static async createTransactionNotification(transaction: Transaction) {
    const title = transaction.transaction_type === "SEND" ? "Payment Received" : "Payment Request"
    const message = `₹${transaction.amount} ${transaction.transaction_type === "SEND" ? "received" : "requested"}`

    await neon.from("notifications").insert({
      user_id: transaction.receiver_id!,
      title,
      message,
      type: "TRANSACTION",
      metadata: { transaction_id: transaction.id },
    })
  }
}
