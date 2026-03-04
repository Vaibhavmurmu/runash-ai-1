import { type NextRequest } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"
import { sql } from "@/lib/db"
import { handleCreateRecordingEdit } from "./edit-route-handler"

async function withTransaction<T>(run: (tx: typeof sql) => Promise<T>): Promise<T> {
  await sql`BEGIN`
  try {
    const result = await run(sql)
    await sql`COMMIT`
    return result
  } catch (error) {
    await sql`ROLLBACK`
    throw error
  }
}

export async function POST(request: NextRequest) {
  return handleCreateRecordingEdit(request, {
    getSession: getServerAuthSession,
    transaction: withTransaction,
  })
}
