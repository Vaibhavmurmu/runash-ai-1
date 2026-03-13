import { NextResponse } from "next/server"
import { getSql } from "@/lib/db/neon"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"

function getExpectedRowVersion(req: Request, body: { row_version?: number } | null): number | null {
  const headerValue = req.headers.get("if-match")
  if (headerValue) {
    const parsed = Number(headerValue.replaceAll('"', ""))
    if (!Number.isNaN(parsed)) return parsed
  }

  const fromBody = body?.row_version
  if (typeof fromBody === "number" && Number.isFinite(fromBody)) return fromBody

  return null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const sql = getSql()
    const { id } = await params
    const [row] = await sql`
      SELECT id, user_id, name, description, price, stock, category, status, rating, sales, image, row_version, created_at, updated_at
      FROM public.products
      WHERE id = ${Number(id)}
        AND user_id = ${userId}
    `
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(row)
  } catch {
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const body = await req.json()
    const expectedRowVersion = getExpectedRowVersion(req, body)
    const fields = {
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock,
      category: body.category,
      status: body.status,
      image: body.image,
    }

    const sql = getSql()
    const { id } = await params
    const [row] = await sql/* sql */`
      UPDATE public.products
      SET
        name = COALESCE(${fields.name}, name),
        description = COALESCE(${fields.description}, description),
        price = COALESCE(${fields.price}, price),
        stock = COALESCE(${fields.stock}, stock),
        category = COALESCE(${fields.category}, category),
        status = COALESCE(${fields.status}, status),
        image = COALESCE(${fields.image}, image),
        row_version = row_version + 1,
        updated_at = now()
      WHERE id = ${Number(id)}
        AND user_id = ${userId}
        AND (${expectedRowVersion === null} OR row_version = ${expectedRowVersion})
      RETURNING id, name, description, price, stock, category, status, rating, sales, image, row_version, created_at, updated_at
    `

    if (!row) {
      const [existing] = await sql`
        SELECT id FROM public.products WHERE id = ${Number(id)} AND user_id = ${userId}
      `
      if (existing) return NextResponse.json({ error: "Conflict: product has changed", code: "VERSION_CONFLICT" }, { status: 409 })
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(row)
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return PUT(req, { params })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const expectedRowVersion = getExpectedRowVersion(req, null)
    const sql = getSql()
    const { id } = await params
    const res = await sql`
      DELETE FROM public.products
      WHERE id = ${Number(id)}
        AND user_id = ${userId}
        AND (${expectedRowVersion === null} OR row_version = ${expectedRowVersion})
    `

    if ((res.count ?? 0) === 0 && expectedRowVersion !== null) {
      const [existing] = await sql`
        SELECT id FROM public.products WHERE id = ${Number(id)} AND user_id = ${userId}
      `
      if (existing) return NextResponse.json({ error: "Conflict: product has changed", code: "VERSION_CONFLICT" }, { status: 409 })
    }

    return NextResponse.json({ ok: true, count: res.count ?? 0 })
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
