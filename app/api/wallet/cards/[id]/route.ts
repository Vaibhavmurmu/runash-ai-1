import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}))
  const userId = typeof body.userId === "string" ? body.userId : null
  const updated = WalletStore.setDefaultCard(userId || "", params.id)
  if (!updated) {
    return NextResponse.json({ success: false, error: { message: "Card not found" } }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.nextUrl.searchParams.get("userId")
  const deleted = WalletStore.removeCard(userId || "", params.id)
  if (!deleted) {
    return NextResponse.json({ success: false, error: { message: "Card not found" } }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: deleted })
}
