import { type NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getServerAuthSession } from "@/lib/auth/session"
import { handleCreateRecordingEdit } from "./edit-route-handler"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  return handleCreateRecordingEdit(request, {
    getSession: getServerAuthSession,
    sql,
  })
}
