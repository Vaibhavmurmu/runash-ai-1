import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { updateCommerceUserData } from "@/lib/commerce-data-store"

const patchSchema = z.object({
  read: z.boolean().optional(),
})

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const userId = request.headers.get("x-user-id") ?? "1"
  const body = await request.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const next = await updateCommerceUserData(userId, (current) => ({
    ...current,
    notifications: current.notifications.map((item) =>
      item.id === params.id ? { ...item, read: parsed.data.read ?? item.read } : item,
    ),
  }))

  return NextResponse.json({ items: next.notifications })
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const userId = request.headers.get("x-user-id") ?? "1"

  const next = await updateCommerceUserData(userId, (current) => ({
    ...current,
    notifications: current.notifications.filter((item) => item.id !== params.id),
  }))

  return NextResponse.json({ items: next.notifications })
}
