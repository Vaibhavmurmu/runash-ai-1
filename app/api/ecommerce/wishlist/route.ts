import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getCommerceUserData, updateCommerceUserData } from "@/lib/commerce-data-store"

const wishlistCreateSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  originalPrice: z.number().positive(),
  inStock: z.boolean(),
  emoji: z.string().min(1).optional(),
  image: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? "1"
  const data = await getCommerceUserData(userId)
  return NextResponse.json({ items: data.wishlist })
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? "1"
  const body = await request.json().catch(() => null)
  const parsed = wishlistCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wishlist payload" }, { status: 400 })
  }

  const next = await updateCommerceUserData(userId, (current) => ({
    ...current,
    wishlist: [
      {
        id: `${Date.now()}`,
        addedDate: new Date().toISOString().slice(0, 10),
        emoji: parsed.data.emoji ?? "🛍️",
        image: parsed.data.image,
        ...parsed.data,
      },
      ...current.wishlist,
    ],
  }))

  return NextResponse.json({ items: next.wishlist }, { status: 201 })
}
