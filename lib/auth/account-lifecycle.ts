import { createHash, randomInt } from "node:crypto"
import { compare } from "bcryptjs"
import { sql } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { invalidateUserSessions, updateUserPassword } from "@/lib/auth-utils"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"

interface DeleteContext {
  userId: number
  requestId?: string
}

type DeleteCallback = (context: DeleteContext) => Promise<void>

const beforeDeleteCallbacks: DeleteCallback[] = []
const afterDeleteCallbacks: DeleteCallback[] = []

function hashCode(code: string) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "runash-account-delete"
  return createHash("sha256").update(`${code}:${secret}`).digest("hex")
}

export function registerBeforeDeleteCallback(callback: DeleteCallback) {
  beforeDeleteCallbacks.push(callback)
}

export function registerAfterDeleteCallback(callback: DeleteCallback) {
  afterDeleteCallbacks.push(callback)
}

export async function ensureAccountLifecycleTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS account_email_change_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      new_email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS account_delete_verifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

registerBeforeDeleteCallback(async ({ userId }) => {
  await Promise.allSettled([
    sql`DELETE FROM user_sessions WHERE user_id = ${userId}`,
    sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`,
    sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`,
    sql`DELETE FROM otp_codes WHERE user_id = ${userId}`,
    sql`DELETE FROM user_passkeys WHERE user_id = ${userId}`,
  ])
})

registerAfterDeleteCallback(async ({ userId, requestId }) => {
  await recordSecurityAuditEvent({
    event: "auth.account.deleted",
    actorUserId: userId,
    resource: "user",
    details: {
      requestId,
      action: "secure_delete",
    },
  })
})

export async function runSecureAccountDelete(context: DeleteContext) {
  for (const callback of beforeDeleteCallbacks) {
    await callback(context)
  }

  await sql`UPDATE users SET role = 'disabled', updated_at = NOW() WHERE id = ${context.userId}`
  await invalidateUserSessions(context.userId, "manual_revoke")

  for (const callback of afterDeleteCallbacks) {
    await callback(context)
  }
}

export async function issueAccountDeletionCode(userId: number, email: string) {
  await ensureAccountLifecycleTables()
  const code = `${randomInt(0, 1_000_000)}`.padStart(6, "0")
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await sql`
    INSERT INTO account_delete_verifications (user_id, code_hash, expires_at, attempts, updated_at)
    VALUES (${userId}, ${hashCode(code)}, ${expiresAt}, 0, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, updated_at = NOW()
  `

  await sendEmail({
    to: email,
    subject: "RunAsh account deletion verification",
    html: `<p>Your RunAsh account deletion verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
  })
}

export async function verifyAccountDeletionCode(userId: number, code: string) {
  await ensureAccountLifecycleTables()
  const [row] = await sql`
    SELECT code_hash, expires_at, attempts
    FROM account_delete_verifications
    WHERE user_id = ${userId}
  ` as Array<{ code_hash: string; expires_at: Date; attempts: number }>

  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) {
    return false
  }

  const valid = hashCode(code) === row.code_hash

  if (!valid) {
    await sql`UPDATE account_delete_verifications SET attempts = attempts + 1, updated_at = NOW() WHERE user_id = ${userId}`
    return false
  }

  await sql`DELETE FROM account_delete_verifications WHERE user_id = ${userId}`
  return true
}

export async function verifyCurrentPassword(userId: number, password: string) {
  const [user] = await sql`SELECT password_hash FROM users WHERE id = ${userId}` as Array<{ password_hash?: string | null }>
  if (!user?.password_hash) {
    return false
  }
  return compare(password, user.password_hash)
}

export async function setOrChangePassword(userId: number, input: { currentPassword?: string; newPassword: string; mode: "set" | "change" }) {
  if (input.mode === "change") {
    const valid = await verifyCurrentPassword(userId, input.currentPassword ?? "")
    if (!valid) {
      throw new Error("Current password is incorrect")
    }
  }

  await updateUserPassword(userId, input.newPassword)
  await invalidateUserSessions(userId, "password_change")
}
