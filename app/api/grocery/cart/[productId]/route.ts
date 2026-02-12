import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { removeFromCart, updateCartQuantity } from "@/lib/repositories/grocery"

const updateQuantitySchema = z.object({
  quantity: z.number().int().positive(),
})

export async function PATCH(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateQuantitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const updated = await updateCartQuantity(userId, params.productId, parsed.data.quantity)
    if (!updated) {
      return NextResponse.json(
        { error: "Unable to update quantity: product missing, cart item missing, or inventory limit reached" },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        productId: updated.product_id,
        quantity: updated.quantity,
      },
    })
  } catch {
    console.error("grocery_cart_patch_failed")
    return NextResponse.json({ error: "Failed to update cart item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const deleted = await removeFromCart(userId, params.productId)
    if (!deleted) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    console.error("grocery_cart_delete_failed")
    return NextResponse.json({ error: "Failed to remove cart item" }, { status: 500 })
  }
}
