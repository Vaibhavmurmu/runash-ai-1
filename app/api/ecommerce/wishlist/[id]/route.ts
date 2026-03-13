import { NextResponse, type NextRequest } from "next/server"
import { updateCommerceUserData } from "@/lib/commerce-data-store"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get("x-user-id") ?? "1"

  const { id } = await params
  const next = await updateCommerceUserData(userId, (current) => ({
    ...current,
    wishlist: current.wishlist.filter((item) => item.id !== id),
  }))

  return NextResponse.json({ items: next.wishlist })
}
