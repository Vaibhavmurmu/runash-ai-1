import { type NextRequest } from "next/server"

import { getServerAuthSession } from "@/lib/auth/session"
import { Database } from "@/lib/database"

import { handleGetUserProfile, handlePatchUserProfile } from "./profile-route-handler"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return handleGetUserProfile(req, params, {
    getSession: () => getServerAuthSession(),
    query: (sql, values) => Database.query(sql, values),
  })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  return handlePatchUserProfile(req, params, {
    getSession: () => getServerAuthSession(),
    query: (sql, values) => Database.query(sql, values),
  })
}
