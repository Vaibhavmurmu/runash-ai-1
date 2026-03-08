import assert from "node:assert/strict"
import test from "node:test"

import { neon } from "@/lib/neon/client"
import { TransactionService } from "@/lib/services/upi-service"

type MutableNeon = {
  from: (table: string) => any
  rpc: (fn: string, payload: Record<string, unknown>) => Promise<{ error: any }>
}

type Txn = {
  transaction_id: string
  status: string
  sender_id: string
  receiver_id: string
  amount: number
  gateway_response: Record<string, unknown> | null
  failure_reason: string | null
  gateway_transaction_id: string | null
}

function installNeonMock(transaction: Txn) {
  const neonMutable = neon as unknown as MutableNeon
  const originalFrom = neonMutable.from
  const originalRpc = neonMutable.rpc
  const rpcCalls: Array<{ fn: string; payload: Record<string, unknown> }> = []

  neonMutable.from = (table: string) => {
    if (table !== "transactions") {
      throw new Error(`Unexpected table: ${table}`)
    }

    const ctx: { mode: "select" | "update"; updatePayload?: Record<string, unknown> } = { mode: "select" }

    return {
      select: () => {
        ctx.mode = "select"
        return {
          eq: () => ({
            single: async () => ({ data: { ...transaction }, error: null }),
          }),
        }
      },
      update: (payload: Record<string, unknown>) => {
        ctx.mode = "update"
        ctx.updatePayload = payload
        return {
          eq: async () => {
            transaction.status = (ctx.updatePayload?.status as string) ?? transaction.status
            if (Object.prototype.hasOwnProperty.call(ctx.updatePayload ?? {}, "failure_reason")) {
              transaction.failure_reason = (ctx.updatePayload?.failure_reason as string | null) ?? null
            }
            if (Object.prototype.hasOwnProperty.call(ctx.updatePayload ?? {}, "gateway_response")) {
              transaction.gateway_response = (ctx.updatePayload?.gateway_response as Record<string, unknown>) ?? null
            }
            return { error: null }
          },
        }
      },
    }
  }

  neonMutable.rpc = async (fn: string, payload: Record<string, unknown>) => {
    rpcCalls.push({ fn, payload })
    return { error: null }
  }

  return {
    rpcCalls,
    restore: () => {
      neonMutable.from = originalFrom
      neonMutable.rpc = originalRpc
    },
  }
}

test("UPI webhook transition processes PENDING -> SUCCESS once and remains idempotent", async () => {
  const txn: Txn = {
    transaction_id: "TXN100",
    status: "PENDING",
    sender_id: "sender_1",
    receiver_id: "receiver_1",
    amount: 499,
    gateway_response: null,
    failure_reason: null,
    gateway_transaction_id: null,
  }

  const { rpcCalls, restore } = installNeonMock(txn)

  try {
    const first = await TransactionService.handleGatewayWebhook({
      transactionId: "TXN100",
      status: "SUCCESS",
      gatewayTransactionId: "gw_1",
      providerRequestId: "req_1",
      rawResponse: { providerCode: "OK" },
    })

    assert.equal(first.error, null)
    assert.equal(first.data?.status, "SUCCESS")
    assert.equal(rpcCalls.length, 1)

    const second = await TransactionService.handleGatewayWebhook({
      transactionId: "TXN100",
      status: "SUCCESS",
      gatewayTransactionId: "gw_1",
      providerRequestId: "req_1",
    })

    assert.equal(second.error, null)
    assert.equal(second.data?.status, "SUCCESS")
    assert.equal(rpcCalls.length, 1)
  } finally {
    restore()
  }
})

test("UPI webhook rejects invalid non-pending state transitions", async () => {
  const txn: Txn = {
    transaction_id: "TXN200",
    status: "FAILED",
    sender_id: "sender_2",
    receiver_id: "receiver_2",
    amount: 999,
    gateway_response: { providerStatus: "FAILED" },
    failure_reason: "declined",
    gateway_transaction_id: "gw_2",
  }

  const { restore } = installNeonMock(txn)

  try {
    const result = await TransactionService.handleGatewayWebhook({
      transactionId: "TXN200",
      status: "SUCCESS",
      gatewayTransactionId: "gw_2",
      providerRequestId: "req_2",
    })

    assert.notEqual(result.error, null)
    assert.equal(result.data, null)
  } finally {
    restore()
  }
})
