import { NextResponse, type NextRequest } from "next/server"
import { updateCommerceUserData } from "@/lib/commerce-data-store"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get("x-user-id") ?? "1"

  const next = await updateCommerceUserData(userId, (current) => ({
    ...current,
    wishlist: current.wishlist.filter((item) => item.id !== params.id),
  }))

  return NextResponse.json({ items: next.wishlist })
}
