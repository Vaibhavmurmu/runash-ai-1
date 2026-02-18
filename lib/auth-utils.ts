import { hash, compare } from "bcryptjs"
import { randomBytes } from "crypto"
import { recordAuthMetric } from "@/lib/auth-observability"
import { recordSecurityAuditEvent } from "@/lib/security-audit-events"
import { sql } from "@/lib/db"

export async function createUser(email: string, password: string, name: string) {
  try {
    const passwordHash = await hash(password, 12)

    const [user] = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${email}, ${passwordHash}, ${name}, 'user')
      RETURNING id, email, name, role, created_at
    `

    return user
  } catch (error) {
    console.error("Error creating user")
    throw new Error("Failed to create user")
  }
}

export async function createPasswordResetToken(userId: number) {
  try {
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
    `

    return token
  } catch (error) {
    console.error("Error creating reset artifact")
    throw new Error("Failed to create password reset token")
  }
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const [resetToken] = await sql`
      SELECT * FROM password_reset_tokens 
      WHERE token = ${token} AND expires_at > NOW() AND used = false
    `

    return resetToken
  } catch (error) {
    console.error("Error verifying reset artifact")
    return null
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const resetToken = await verifyPasswordResetToken(token)
    if (!resetToken) {
      throw new Error("Invalid or expired token")
    }

    const passwordHash = await hash(newPassword, 12)

    // Update password
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${resetToken.user_id}
    `

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE token = ${token}
    `

    await invalidateUserSessions(resetToken.user_id, "password_reset")

    return true
  } catch (error) {
    console.error("Error applying credential update")
    throw new Error("Failed to reset password")
  }
}

export async function createEmailVerificationToken(userId: number) {
  try {
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    await sql`
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
    `

    return token
  } catch (error) {
    console.error("Error creating verification artifact")
    throw new Error("Failed to create email verification token")
  }
}

export async function verifyEmailToken(token: string) {
  try {
    const [verificationToken] = await sql`
      SELECT * FROM email_verification_tokens 
      WHERE token = ${token} AND expires_at > NOW() AND used = false
    `

    if (!verificationToken) {
      return null
    }

    // Mark token as used and verify user email
    await sql`
      UPDATE email_verification_tokens 
      SET used = true 
      WHERE token = ${token}
    `

    await sql`
      UPDATE users 
      SET email_verified = true, email_verified_at = NOW()
      WHERE id = ${verificationToken.user_id}
    `

    return verificationToken
  } catch (error) {
    console.error("Error verifying email artifact")
    return null
  }
}

export async function getUserByEmail(email: string) {
  try {
    const [user] = await sql`
      SELECT * FROM users WHERE email = ${email}
    `
    return user
  } catch (error) {
    console.error("Error getting user by email")
    return null
  }
}

export async function getUserById(id: number) {
  try {
    const [user] = await sql`
      SELECT * FROM users WHERE id = ${id}
    `
    return user
  } catch (error) {
    console.error("Error getting user by id")
    return null
  }
}

export async function updateUserPassword(userId: number, newPassword: string) {
  try {
    const passwordHash = await hash(newPassword, 12)

    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${userId}
    `

    return true
  } catch (error) {
    console.error("Error updating user credential")
    throw new Error("Failed to update password")
  }
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  try {
    // First verify the current password
    const user = await getUserById(userId)
    if (!user) {
      throw new Error("User not found")
    }

    const isCurrentPasswordValid = await compare(currentPassword, user.password_hash)

    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect")
    }

    // Update to new password
    await updateUserPassword(userId, newPassword)
    await invalidateUserSessions(userId, "password_change")

    // Log the password change for security
    await sql`
      INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent, created_at)
      VALUES (${userId}, 'password_changed', 'User changed their password', '', '', NOW())
    `

    return true
  } catch (error) {
    console.error("Error changing user credential")
    throw error
  }
}

export async function generateEmailVerificationToken(userId: number) {
  try {
    // Delete any existing verification tokens for this user
    await sql`
      DELETE FROM email_verification_tokens 
      WHERE user_id = ${userId} AND used = false
    `

    // Create new verification token
    const token = await createEmailVerificationToken(userId)

    return token
  } catch (error) {
    console.error("Error generating verification artifact")
    throw new Error("Failed to generate email verification token")
  }
}

export async function createUserSession(userId: number, sessionToken: string, expires: Date) {
  try {
    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${userId}, ${sessionToken}, ${expires})
    `

    recordAuthMetric("auth.session.created", { source: "createUserSession", userId })
    await recordSecurityAuditEvent({
      event: "auth.session.created",
      actorUserId: userId,
      resource: "auth_session",
      details: {
        source: "createUserSession",
        expiresAt: expires.toISOString(),
      },
    })

    return true
  } catch (error) {
    console.error("Error creating user session")
    throw new Error("Failed to create session")
  }
}

export async function deleteUserSession(sessionToken: string) {
  try {
    await sql`
      DELETE FROM user_sessions WHERE session_token = ${sessionToken}
    `

    recordAuthMetric("auth.session.revoked", { source: "deleteUserSession" })
    await recordSecurityAuditEvent({
      event: "auth.session.revoked",
      resource: "auth_session",
      details: {
        source: "deleteUserSession",
      },
    })

    return true
  } catch (error) {
    console.error("Error deleting user session")
    throw new Error("Failed to delete session")
  }
}

export async function invalidateUserSessions(
  userId: number,
  reason: "password_change" | "password_reset" | "api_key_rotated" | "manual_revoke",
) {
  try {
    await sql`
      DELETE FROM user_sessions WHERE user_id = ${userId}
    `
  } catch {
    // best-effort invalidation for mixed schema deployments
  }

  try {
    await sql`
      DELETE FROM session WHERE user_id = ${String(userId)}
    `
  } catch {
    // best-effort invalidation for Better Auth session table
  }

  recordAuthMetric("auth.session.invalidated", { reason, userId })
  await recordSecurityAuditEvent({
    event: "auth.session.invalidated",
    actorUserId: userId,
    resource: "auth_session",
    details: {
      reason,
      source: "invalidateUserSessions",
    },
  })
}

export async function cleanupExpiredTokens() {
  try {
    await sql`
      DELETE FROM password_reset_tokens WHERE expires_at < NOW()
    `
    await sql`
      DELETE FROM email_verification_tokens WHERE expires_at < NOW()
    `
    await sql`
      DELETE FROM user_sessions WHERE expires_at < NOW()
    `
    return true
  } catch (error) {
    console.error("Error cleaning up expired auth artifacts")
    return false
  }
}
