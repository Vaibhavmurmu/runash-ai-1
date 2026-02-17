import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { queryMany, queryOne } from "@/lib/db"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { ensureAdminAuthMigrationTables } from "@/lib/migration-helpers"

const updateFlagSchema = z.object({
  name: z.string().min(2).max(100),
  enabled: z.boolean(),
  rolloutPercent: z.number().int().min(0).max(100).default(0),
  description: z.string().max(300).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.flags.list",
  })
  if (!auth.success) return auth.response

  await ensureAdminAuthMigrationTables()
  const flags = await queryMany(`SELECT id, name, enabled, rollout_percent, description, updated_by, updated_at, created_at FROM feature_flags ORDER BY name ASC`)
  return NextResponse.json({ data: flags })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.flags.upsert",
  })
  if (!auth.success) return auth.response

  const parsed = updateFlagSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureAdminAuthMigrationTables()
  const flag = await queryOne(
    `INSERT INTO feature_flags (name, enabled, rollout_percent, description, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (name)
     DO UPDATE SET enabled = EXCLUDED.enabled, rollout_percent = EXCLUDED.rollout_percent, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING id, name, enabled, rollout_percent, description, updated_by, updated_at, created_at`,
    [parsed.data.name, parsed.data.enabled, parsed.data.rolloutPercent, parsed.data.description ?? null, auth.userId],
  )

  return NextResponse.json({ data: flag })
}
