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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const sql = getSql()
    const [order] = await sql /* sql */`
      SELECT o.*, COALESCE(json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity, 'price', oi.price))
                           FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
      FROM public.orders o
      LEFT JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.id = ${Number(params.id)}
        AND o.user_id = ${userId}
      GROUP BY o.id
    `
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const body = await req.json()
    const expectedRowVersion = getExpectedRowVersion(req, body)
    const { status } = body
    const sql = getSql()

    const [row] = await sql /* sql */`
      UPDATE public.orders
      SET status = COALESCE(${status}, status), row_version = row_version + 1, updated_at = now()
      WHERE id = ${Number(params.id)}
        AND user_id = ${userId}
        AND (${expectedRowVersion === null} OR row_version = ${expectedRowVersion})
      RETURNING id, status, row_version, updated_at
    `

    if (!row) {
      const [existing] = await sql`
        SELECT id FROM public.orders WHERE id = ${Number(params.id)} AND user_id = ${userId}
      `
      if (existing) return NextResponse.json({ error: "Conflict: order has changed", code: "VERSION_CONFLICT" }, { status: 409 })
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(row)
  } catch {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId
    const expectedRowVersion = getExpectedRowVersion(req, null)
    const sql = getSql()
    const res = await sql`
      DELETE FROM public.orders
      WHERE id = ${Number(params.id)}
        AND user_id = ${userId}
        AND (${expectedRowVersion === null} OR row_version = ${expectedRowVersion})
    `

    if ((res.count ?? 0) === 0 && expectedRowVersion !== null) {
      const [existing] = await sql`
        SELECT id FROM public.orders WHERE id = ${Number(params.id)} AND user_id = ${userId}
      `
      if (existing) return NextResponse.json({ error: "Conflict: order has changed", code: "VERSION_CONFLICT" }, { status: 409 })
    }

    return NextResponse.json({ ok: true, count: res.count ?? 0 })
  } catch {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}
