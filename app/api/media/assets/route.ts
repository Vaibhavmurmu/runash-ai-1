import { NextResponse, type NextRequest } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { mediaAssetsQuerySchema } from "@/lib/api/contracts"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const url = new URL(request.url)
  const parsedQuery = mediaAssetsQuerySchema.safeParse({ projectId: url.searchParams.get("projectId") ?? undefined })
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query", code: "INVALID_REQUEST" }, { status: 400 })
  }

  const projectId = parsedQuery.data.projectId

  const assets = projectId
    ? await sql`
        SELECT *
        FROM media_assets
        WHERE owner_id=${auth.userId} AND project_id=${projectId}
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT *
        FROM media_assets
        WHERE owner_id=${auth.userId}
        ORDER BY created_at DESC
      `

  return NextResponse.json({ assets })
}
