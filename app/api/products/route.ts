import { NextResponse } from "next/server"
import { getSql } from "@/lib/db/neon"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get("q")?.toLowerCase() || ""
    const category = url.searchParams.get("category") || "all"
    const userId = Number(req.headers.get("x-user-id") || 1)

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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = Number(req.headers.get("x-user-id") || 1)
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
