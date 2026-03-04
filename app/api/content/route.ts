import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { getServerAuthSession } from "@/lib/auth/session"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentData = await req.json()

    // Create content item
    const content = await Database.query(
      `
      INSERT INTO content_items (
        user_id, title, description, type, status, visibility,
        file_url, thumbnail_url, duration, file_size, tags, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `,
      [
        session.user.id,
        contentData.title,
        contentData.description || null,
        contentData.type,
        contentData.status || "draft",
        contentData.visibility || "private",
        contentData.file_url || null,
        contentData.thumbnail_url || null,
        contentData.duration || null,
        contentData.file_size || null,
        contentData.tags || [],
        contentData.category,
      ],
    )

    return NextResponse.json(content[0])
  } catch (error) {
    console.error("Create content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let whereClause = "WHERE visibility = 'public' AND status = 'published'"
    const params: any[] = []
    let paramIndex = 1

    if (type) {
      whereClause += ` AND type = $${paramIndex}`
      params.push(type)
      paramIndex++
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    const content = await Database.query(
      `
      SELECT ci.*, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar
      FROM content_items ci
      JOIN users u ON ci.user_id = u.id
      ${whereClause}
      ORDER BY ci.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
      [...params, limit, offset],
    )

    const totalResult = await Database.query(`SELECT COUNT(*) as total FROM content_items ci ${whereClause}`, params)

    return NextResponse.json({
      content,
      total: Number.parseInt(totalResult[0].total),
    })
  } catch (error) {
    console.error("Get content error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
