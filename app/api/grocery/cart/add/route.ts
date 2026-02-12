import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { addToCart } from "@/lib/repositories/grocery"

const addCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = addCartSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const added = await addToCart(userId, parsed.data.productId, parsed.data.quantity)
    if (!added) {
      return NextResponse.json({ error: "Unable to add item: inventory limit reached or product unavailable" }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      item: {
        id: added.id,
        productId: added.product_id,
        quantity: added.quantity,
      },
    })
  } catch {
    console.error("grocery_cart_add_failed")
    return NextResponse.json({ error: "Failed to add cart item" }, { status: 500 })
  }
}
