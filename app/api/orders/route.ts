import { NextResponse } from "next/server"
import { z } from "zod"
import { getSql } from "@/lib/db/neon"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"
import { getServerAuthSession } from "@/lib/auth/session"
import { checkoutOrderSchema } from "@/lib/types/checkout-order"

const createOrderRequestSchema = checkoutOrderSchema.transform((payload) => ({
  buyer_name: `${payload.customer.firstName} ${payload.customer.lastName}`.trim(),
  buyer_email: payload.customer.email,
  buyer_phone: payload.customer.phone ?? "",
  shipping_address: [payload.customer.address, payload.customer.city, payload.customer.state, payload.customer.zipCode]
    .filter(Boolean)
    .join(", "),
  payment_method: payload.payment.method,
  items: payload.items,
}))

function toValidationError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: "Invalid order payload",
      code: "INVALID_ORDER_PAYLOAD",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    },
    { status: 400 },
  )
}

async function requireBuyerSessionUserId(req: Request): Promise<number | Response> {
  const session = await getServerAuthSession(req.headers)
  const rawUserId = session?.user?.id?.toString().trim()

  if (!rawUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsedUserId = Number.parseInt(rawUserId, 10)
  if (Number.isNaN(parsedUserId)) {
    return NextResponse.json({ error: "Invalid session user id" }, { status: 403 })
  }

  return parsedUserId
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get("status") || "all"
    const search = (url.searchParams.get("q") || "").toLowerCase()
    const userId = await requireSellerSessionUserId(req)
    if (userId instanceof Response) return userId

    const sql = getSql()
    const orders = await sql /* sql */`
      SELECT o.id, o.buyer_name, o.buyer_email, o.buyer_phone, o.shipping_address, o.payment_method,
             o.status, o.total, o.row_version, o.created_at, o.updated_at,
             COALESCE(json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity, 'price', oi.price))
                      FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
      FROM public.orders o
      LEFT JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ${userId}
        AND (${status === "all"} OR o.status = ${status})
        AND (${search === ""} OR LOWER(o.buyer_name) LIKE ${"%" + search + "%"} OR LOWER(o.buyer_email) LIKE ${"%" + search + "%"})
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 200
    `
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: "Failed to list orders" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireBuyerSessionUserId(req)
    if (userId instanceof Response) return userId

    const rawBody = await req.json()
    const parsedBody = createOrderRequestSchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return toValidationError(parsedBody.error)
    }

    const { buyer_name, buyer_email, buyer_phone, shipping_address, payment_method, items } = parsedBody.data
    const total = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0)
    const sql = getSql()

    const [order] =
      await sql /* sql */`INSERT INTO public.orders (user_id, buyer_name, buyer_email, buyer_phone, shipping_address, payment_method, total)
                          VALUES (${userId}, ${buyer_name}, ${buyer_email}, ${buyer_phone}, ${shipping_address}, ${payment_method}, ${total})
                          RETURNING id, status, total, row_version, created_at, updated_at`

    for (const it of items) {
      await sql /* sql */`
        INSERT INTO public.order_items (order_id, product_id, name, quantity, price)
        VALUES (${order.id}, ${it.product_id || null}, ${it.name}, ${it.quantity}, ${it.price})
      `
      if (it.product_id) {
        await sql /* sql */`
          UPDATE public.products
          SET stock = GREATEST(0, stock - ${it.quantity}), sales = sales + ${it.quantity}, row_version = row_version + 1, updated_at = now()
          WHERE id = ${it.product_id}
        `
      }
    }

    return NextResponse.json({ id: order.id, total, status: order.status, row_version: order.row_version }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
