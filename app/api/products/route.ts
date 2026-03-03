import { NextResponse } from "next/server"
import { getSql } from "@/lib/db/neon"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get("q")?.toLowerCase() || ""
    const category = url.searchParams.get("category") || "all"
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId

    const sql = getSql()
    const rows = await sql`
      SELECT id, name, description, price, stock, category, status, rating, sales, image, row_version, created_at, updated_at
      FROM public.products
      WHERE user_id = ${userId}
        AND (${search === ""} OR LOWER(name) LIKE ${"%" + search + "%"})
        AND (${category === "all"} OR category = ${category})
      ORDER BY updated_at DESC
      LIMIT 200
    `
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const { name, description, price, stock, category, status = "active", image } = body

    if (!name || price == null) {
      return NextResponse.json({ error: "name and price required" }, { status: 400 })
    }

    const sql = getSql()
    const [row] = await sql /* sql */`
      INSERT INTO public.products (user_id, name, description, price, stock, category, status, image)
      VALUES (${userId}, ${name}, ${description || null}, ${price}, ${stock ?? 0}, ${category || null}, ${status}, ${image || null})
      RETURNING id, name, description, price, stock, category, status, rating, sales, image, row_version, created_at, updated_at
    `
    return NextResponse.json(row, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
