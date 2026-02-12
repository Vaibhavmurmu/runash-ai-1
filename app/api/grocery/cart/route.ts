import { NextResponse, type NextRequest } from "next/server"
import { listCartItems } from "@/lib/repositories/grocery"

function formatCartItem(item: Awaited<ReturnType<typeof listCartItems>>[number]) {
  return {
    id: item.id,
    productId: item.product_id,
    quantity: item.quantity,
    product: {
      id: item.product_id,
      name: item.product_name,
      price: Number(item.product_price),
      category: item.product_category,
      inStock: item.in_stock,
      stockQuantity: item.stock_quantity,
    },
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const items = await listCartItems(userId)
    const formatted = items.map(formatCartItem)
    const subtotal = formatted.reduce((total, item) => total + item.product.price * item.quantity, 0)

    return NextResponse.json({
      items: formatted,
      totalItems: formatted.reduce((total, item) => total + item.quantity, 0),
      subtotal,
    })
  } catch {
    console.error("grocery_cart_list_failed")
    return NextResponse.json({ error: "Failed to load cart" }, { status: 500 })
  }
}
