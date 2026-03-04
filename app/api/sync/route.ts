import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db"

async function getSession() {
  const { getServerAuthSession } = await import("@/lib/auth/session")
  return getServerAuthSession()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getSql()
    const syncData = await request.json()
    const { type, data, action, timestamp } = syncData

    // Check for conflicts by comparing timestamps
    let conflict = false
    let serverData = null

    if (action === "update") {
      const existing = await getExistingRecord(sql, type, data.id)
      if (existing && existing.updated_at > new Date(timestamp)) {
        conflict = true
        serverData = existing
      }
    }

    if (!conflict) {
      // Apply the sync operation
      await applySyncOperation(sql, type, action, data, session.user.id)
    }

    return NextResponse.json({
      success: true,
      conflict,
      serverData,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

async function getExistingRecord(sql: ReturnType<typeof getSql>, type: string, id: string) {
  switch (type) {
    case "stream":
      const streams = await sql`SELECT * FROM streams WHERE id = ${id}`
      return streams[0] || null
    case "recording":
      const recordings = await sql`SELECT * FROM streams WHERE id = ${id} AND status = 'completed'`
      return recordings[0] || null
    default:
      return null
  }
}

async function applySyncOperation(
  sql: ReturnType<typeof getSql>,
  type: string,
  action: string,
  data: any,
  userId: string,
) {
  switch (type) {
    case "stream":
      await syncStream(sql, action, data, userId)
      break
    case "recording":
      await syncRecording(sql, action, data, userId)
      break
    case "settings":
      await syncSettings(action, data, userId)
      break
    case "template":
      await syncTemplate(action, data, userId)
      break
    default:
      throw new Error(`Unknown sync type: ${type}`)
  }
}

async function syncStream(sql: ReturnType<typeof getSql>, action: string, data: any, userId: string) {
  switch (action) {
    case "create":
      await sql`
        INSERT INTO streams (id, user_id, title, description, status, created_at, updated_at)
        VALUES (${data.id}, ${userId}, ${data.title}, ${data.description}, ${data.status}, NOW(), NOW())
      `
      break
    case "update":
      await sql`
        UPDATE streams 
        SET title = ${data.title}, description = ${data.description}, 
            status = ${data.status}, updated_at = NOW()
        WHERE id = ${data.id} AND user_id = ${userId}
      `
      break
    case "delete":
      await sql`DELETE FROM streams WHERE id = ${data.id} AND user_id = ${userId}`
      break
  }
}

async function syncRecording(sql: ReturnType<typeof getSql>, action: string, data: any, userId: string) {
  switch (action) {
    case "create":
      await sql`
        INSERT INTO streams (id, user_id, title, description, status, duration, created_at, updated_at)
        VALUES (${data.id}, ${userId}, ${data.title}, ${data.description}, 'completed', ${data.duration}, NOW(), NOW())
      `
      break
    case "update":
      await sql`
        UPDATE streams 
        SET title = ${data.title}, description = ${data.description}, updated_at = NOW()
        WHERE id = ${data.id} AND user_id = ${userId}
      `
      break
    case "delete":
      await sql`DELETE FROM streams WHERE id = ${data.id} AND user_id = ${userId}`
      break
  }
}

async function syncSettings(action: string, data: any, userId: string) {
  // Implement settings sync logic
  console.log("Syncing settings:", { action, data, userId })
}

async function syncTemplate(action: string, data: any, userId: string) {
  // Implement template sync logic
  console.log("Syncing template:", { action, data, userId })
}
