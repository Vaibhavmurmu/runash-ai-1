import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerAuthSession } from "@/lib/auth/session"
import { buildTenantScopePredicate, resolveSessionOrganizationId } from "@/lib/api/route-auth"
import { runSecureAccountDelete, issueAccountDeletionCode, verifyAccountDeletionCode } from "@/lib/auth/account-lifecycle"
import { sql } from "@/lib/db"

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  username: z.string().min(3).max(60).optional(),
  phone: z.string().min(8).max(20).optional(),
})

const deleteSchema = z.object({
  verificationCode: z.string().length(6),
})

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const tenantScope = buildTenantScopePredicate("sso_organization_id", resolveSessionOrganizationId(session), 2)
  const users = (await (sql as any).unsafe(
    `
      SELECT id, email, username, name, phone, email_verified, role, created_at, updated_at
      FROM users
      WHERE id = $1
        AND ${tenantScope.predicate}
    `,
    [Number.parseInt(session.user.id), ...tenantScope.values],
  )) as Array<Record<string, unknown>>

  if (!users[0]) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 })
  }

  return NextResponse.json({ user: users[0] })
}

export async function PATCH(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const updates = parsed.data
  const tenantScope = buildTenantScopePredicate("sso_organization_id", resolveSessionOrganizationId(session), 5)
  const updatedRows = (await (sql as any).unsafe(
    `
      UPDATE users
      SET name = COALESCE($1, name),
          username = COALESCE($2, username),
          phone = COALESCE($3, phone),
          updated_at = NOW()
      WHERE id = $4
        AND ${tenantScope.predicate}
      RETURNING id
    `,
    [updates.name ?? null, updates.username ?? null, updates.phone ?? null, Number.parseInt(session.user.id), ...tenantScope.values],
  )) as Array<{ id: string }>

  if (!updatedRows[0]) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 })
  }

  return NextResponse.json({ message: "Account updated successfully" })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  if (!body?.verificationCode) {
    const tenantScope = buildTenantScopePredicate("sso_organization_id", resolveSessionOrganizationId(session), 2)
    const users = (await (sql as any).unsafe(
      `SELECT email FROM users WHERE id = $1 AND ${tenantScope.predicate}`,
      [Number.parseInt(session.user.id), ...tenantScope.values],
    )) as Array<{ email: string }>

    if (!users[0]) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 })
    }

    await issueAccountDeletionCode(Number.parseInt(session.user.id), users[0].email)
    return NextResponse.json({ message: "Verification code sent to your email" }, { status: 202 })
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid verification code" }, { status: 400 })
  }

  const isValid = await verifyAccountDeletionCode(Number.parseInt(session.user.id), parsed.data.verificationCode)
  if (!isValid) {
    return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 })
  }

  await runSecureAccountDelete({
    userId: Number.parseInt(session.user.id),
    requestId: request.headers.get("x-request-id") ?? undefined,
  })

  return NextResponse.json({ message: "Account deleted successfully" })
}
