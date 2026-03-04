import { NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { createDataset, listDatasets } from "@/lib/server/analytics-pro-dataset-store"
import type { AnalyticsDataset } from "@/lib/analytics-pro"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return NextResponse.json({ datasets: listDatasets(session.user.id) })
}

export async function POST(req: Request) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json()) as Partial<AnalyticsDataset>
  if (!body.name || !body.description || !body.source) {
    return NextResponse.json({ error: "name, description and source are required" }, { status: 400 })
  }

  const created = createDataset(session.user.id, {
    name: body.name,
    description: body.description,
    source: body.source,
    records: typeof body.records === "number" ? body.records : 0,
    tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : [],
  })

  return NextResponse.json({ dataset: created }, { status: 201 })
}
