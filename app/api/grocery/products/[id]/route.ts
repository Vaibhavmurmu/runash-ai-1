import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import {
  deleteGroceryProduct,
  getGroceryProductById,
  type GroceryProductRecord,
  updateGroceryProduct,
} from "@/lib/repositories/grocery"

const productUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.number().nonnegative().optional(),
    priceInr: z.number().nonnegative().nullable().optional(),
    category: z.string().min(1).optional(),
    subcategory: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    images: z.array(z.string().url()).optional(),
    inStock: z.boolean().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    unit: z.string().min(1).optional(),
    minOrderQuantity: z.number().int().positive().optional(),
    maxOrderQuantity: z.number().int().positive().optional(),
    isOrganic: z.boolean().optional(),
    isFreshProduce: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")

function getUserContext(request: NextRequest) {
  return {
    userId: request.headers.get("x-user-id"),
    role: (request.headers.get("x-user-role") ?? "").toLowerCase(),
  }
}

function hasWriteAccess(role: string) {
  return role === "admin" || role === "seller"
}

function asClientProduct(product: GroceryProductRecord) {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: Number(product.price),
    priceINR: product.price_inr == null ? undefined : Number(product.price_inr),
    category: product.category,
    subcategory: product.subcategory ?? "",
    brand: product.brand ?? "",
    images: product.images ?? [],
    inStock: product.in_stock,
    stockQuantity: product.stock_quantity,
    unit: product.unit,
    minOrderQuantity: product.min_order_quantity,
    maxOrderQuantity: product.max_order_quantity,
    isOrganic: product.is_organic,
    isFreshProduce: product.is_fresh_produce,
    averageRating: Number(product.average_rating),
    totalReviews: product.total_reviews,
    tags: product.tags ?? [],
  }
}

export async function GET(_: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  try {
    const product = await getGroceryProductById(params.id)
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(asClientProduct(product))
  } catch {
    console.error("grocery_product_get_failed")
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  try {
    const { userId, role } = getUserContext(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasWriteAccess(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const updated = await updateGroceryProduct(params.id, parsed.data)
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(asClientProduct(updated))
  } catch {
    console.error("grocery_product_patch_failed")
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context)
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  try {
    const { userId, role } = getUserContext(request)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!hasWriteAccess(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const deleted = await deleteGroceryProduct(params.id)
    if (!deleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    console.error("grocery_product_delete_failed")
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
