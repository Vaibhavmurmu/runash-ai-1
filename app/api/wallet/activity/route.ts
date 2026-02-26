import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  return NextResponse.json({ success: true, data: WalletStore.listActivity(userId) })
}
