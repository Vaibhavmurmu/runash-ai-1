import { type NextRequest } from "next/server"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { sql } from "@/lib/db"

async function getSession() {
  const { getServerAuthSession } = await import("@/lib/auth/session")
  return getServerAuthSession()
}

type SearchResultType = "product" | "stream" | "category" | "recording"

type SearchResult = {
  id: string
  type: SearchResultType
  title: string
  description: string
  image?: string
  price?: number
  date?: string
  count?: number
  tags?: string[]
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return respondError(
        request,
        { code: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401, legacy: { error: "Unauthorized" } },
      )
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("query") || "").trim()
    const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit") || 20)))

    if (!query) {
      return respondSuccess(request, { query, intent: null, suggestions: [], results: [] }, { legacy: [] })
    }

    const q = `%${query.toLowerCase()}%`

    const [products, streams, recordings, categories] = await Promise.all([
      sql`
        SELECT id, name, description, price, image_url, category
        FROM products
        WHERE user_id = ${session.user.id}
          AND (
            LOWER(name) LIKE ${q}
            OR LOWER(COALESCE(description, '')) LIKE ${q}
            OR LOWER(COALESCE(category, '')) LIKE ${q}
          )
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `,
      sql`
        SELECT id, title, description, thumbnail_url, status, scheduled_start
        FROM streams
        WHERE user_id = ${session.user.id}
          AND (
            LOWER(title) LIKE ${q}
            OR LOWER(COALESCE(description, '')) LIKE ${q}
            OR LOWER(COALESCE(category, '')) LIKE ${q}
          )
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `,
      sql`
        SELECT r.id, r.title, r.description, r.thumbnail_url, r.created_at
        FROM recordings r
        JOIN streams s ON s.id = r.stream_id
        WHERE s.user_id = ${session.user.id}
          AND (
            LOWER(r.title) LIKE ${q}
            OR LOWER(COALESCE(r.description, '')) LIKE ${q}
          )
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `,
      sql`
        SELECT category, COUNT(*)::int AS count
        FROM products
        WHERE user_id = ${session.user.id}
          AND LOWER(COALESCE(category, '')) LIKE ${q}
        GROUP BY category
        ORDER BY COUNT(*) DESC
        LIMIT 8
      `,
    ])

    const productResults: SearchResult[] = products.map((row: any) => ({
      id: String(row.id),
      type: "product",
      title: String(row.name),
      description: String(row.description || "No description available."),
      image: row.image_url ? String(row.image_url) : undefined,
      price: Number(row.price || 0),
      tags: row.category ? [String(row.category)] : [],
    }))

    const streamResults: SearchResult[] = streams.map((row: any) => ({
      id: String(row.id),
      type: "stream",
      title: String(row.title),
      description: String(row.description || "Live stream"),
      image: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
      date: row.status === "live" ? "Live" : row.scheduled_start ? new Date(row.scheduled_start).toLocaleString() : "Scheduled",
    }))

    const recordingResults: SearchResult[] = recordings.map((row: any) => ({
      id: String(row.id),
      type: "recording",
      title: String(row.title),
      description: String(row.description || "Recording"),
      image: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined,
    }))

    const categoryResults: SearchResult[] = categories
      .filter((row: any) => row.category)
      .map((row: any) => ({
        id: `category-${String(row.category).toLowerCase().replace(/\s+/g, "-")}`,
        type: "category",
        title: String(row.category),
        description: `Products in ${String(row.category)}`,
        count: Number(row.count || 0),
      }))

    const results = [...productResults, ...streamResults, ...recordingResults, ...categoryResults].slice(0, limit)
    const suggestions = Array.from(new Set(results.map((item) => item.title))).slice(0, 5)

    return respondSuccess(
      request,
      {
        query,
        intent: null,
        suggestions,
        results,
      },
      { legacy: results },
    )
  } catch {
    return respondError(
      request,
      { code: "SEARCH_FAILED", message: "Failed to load search results" },
      { status: 500, legacy: { error: "Failed to load search results" } },
    )
  }
}
