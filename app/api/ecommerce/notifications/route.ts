import { NextResponse, type NextRequest } from "next/server"
import { getCommerceUserData } from "@/lib/commerce-data-store"

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? "1"
  const data = await getCommerceUserData(userId)
  return NextResponse.json({ items: data.notifications })
}
