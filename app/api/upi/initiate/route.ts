import { NextResponse } from "next/server"

function buildTransactionId() {
  return `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function POST() {
  const transactionId = buildTransactionId()
  const initiatedAt = new Date().toISOString()

  return NextResponse.json({
    transactionId,
    status: "initiated",
    initiatedAt,
  })
}
