import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { removeDataset, updateDataset } from "@/lib/server/analytics-pro-dataset-store"
import type { AnalyticsDataset } from "@/lib/analytics-pro"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = (await req.json()) as Partial<AnalyticsDataset>
  const updated = updateDataset(session.user.id, id, {
    name: body.name,
    description: body.description,
    source: body.source,
    records: body.records,
    tags: body.tags,
  })

  if (!updated) return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
  return NextResponse.json({ dataset: updated })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const deleted = removeDataset(session.user.id, id)
  if (!deleted) return NextResponse.json({ error: "Dataset not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
