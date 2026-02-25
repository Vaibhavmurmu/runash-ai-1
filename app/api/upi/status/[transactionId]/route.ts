import { NextResponse } from "next/server"

type UpiStatus = "pending" | "success" | "failed" | "timeout"

function parseTimestamp(transactionId: string) {
  const parts = transactionId.split("-")
  const epoch = Number(parts[1])
  return Number.isFinite(epoch) ? epoch : Date.now()
}

function resolveTerminalStatus(transactionId: string): "success" | "failed" {
  const checksum = transactionId
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return checksum % 7 === 0 ? "failed" : "success"
}

export async function GET(_: Request, context: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await context.params
  const createdAtEpoch = parseTimestamp(transactionId)
  const elapsedMs = Date.now() - createdAtEpoch

  let status: UpiStatus = "pending"
  let failedReason: string | undefined

  if (elapsedMs > 45_000) {
    status = "timeout"
  } else if (elapsedMs > 12_000) {
    const terminal = resolveTerminalStatus(transactionId)
    status = terminal

    if (terminal === "failed") {
      failedReason = "UPI provider declined the payment."
    }
  }

  return NextResponse.json({
    transactionId,
    status,
    transactionReference: `REF-${transactionId.slice(-10).toUpperCase()}`,
    updatedAt: new Date().toISOString(),
    ...(failedReason ? { failedReason } : {}),
  })
}
