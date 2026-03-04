import { neon } from "@neondatabase/serverless"
import { createHash, randomBytes } from "crypto"
import { sendMagicLinkEmail } from "./email"
import { logApiEvent } from "./api/logging"

const sql = neon(process.env.DATABASE_URL!)

function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex").slice(0, 16)
}

export interface MagicLinkToken {
  id: number
  token: string
  user_id: number
  expires_at: Date
  used: boolean
  created_at: Date
}

export async function createMagicLinkToken(email: string): Promise<{ token: string; user: any } | null> {
  try {
    // Check if user exists
    const users = await sql`
      SELECT id, email, name FROM users WHERE email = ${email}
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0]
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Clean up old tokens for this user
    await sql`
      DELETE FROM email_verification_tokens 
      WHERE user_id = ${user.id} AND expires_at < NOW()
    `

    // Create new magic link token
    await sql`
      INSERT INTO email_verification_tokens (user_id, token, expires_at, used)
      VALUES (${user.id}, ${token}, ${expiresAt}, false)
    `

    return { token, user }
  } catch (error) {
    logApiEvent("error", "auth.magic_link.token.create_failed", {
      requestId: randomBytes(8).toString("hex"),
      route: "internal/magic-link",
      method: "INTERNAL",
      details: { outcome: "error", identifierHash: hashIdentifier(email) },
      error,
    })
    return null
  }
}

export async function verifyMagicLinkToken(token: string): Promise<{ user: any; success: boolean }> {
  return verifyMagicLinkTokenWithClient(sql, token)
}

export async function verifyMagicLinkTokenWithClient(
  sqlClient: ReturnType<typeof neon>,
  token: string,
): Promise<{ user: any; success: boolean }> {
  const requestId = randomBytes(8).toString("hex")
  try {
    const result = await sqlClient`
      SELECT t.*, u.id as user_id, u.email, u.name, u.avatar_url, u.role
      FROM email_verification_tokens t
      JOIN users u ON t.user_id = u.id
      WHERE t.token = ${token} 
        AND t.used = false 
        AND t.expires_at > NOW()
    `

    if (result.length === 0) {
      return { user: null, success: false }
    }

    const tokenData = result[0]

    // Mark token as used
    await sqlClient`
      UPDATE email_verification_tokens 
      SET used = true 
      WHERE token = ${token}
    `

    // Update user's email verification status if not already verified
    await sqlClient`
      UPDATE users 
      SET email_verified = true, email_verified_at = NOW()
      WHERE id = ${tokenData.user_id} AND email_verified = false
    `

    return {
      user: {
        id: tokenData.user_id,
        email: tokenData.email,
        name: tokenData.name,
        avatar_url: tokenData.avatar_url,
        role: tokenData.role,
      },
      success: true,
    }
  } catch (error) {
    logApiEvent("error", "auth.magic_link.token.verify_failed", {
      requestId,
      route: "internal/magic-link",
      method: "INTERNAL",
      details: { outcome: "error" },
      error,
    })
    return { user: null, success: false }
  }
}

export async function sendMagicLink(email: string, token: string, userName?: string): Promise<boolean> {
  const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/magic-link?token=${token}`

  try {
    await sendMagicLinkEmail({
      to: email,
      magicLinkUrl,
      userName,
    })
    return true
  } catch (error) {
    logApiEvent("error", "auth.magic_link.email.send_failed", {
      requestId: randomBytes(8).toString("hex"),
      route: "internal/magic-link",
      method: "INTERNAL",
      details: { outcome: "error", identifierHash: hashIdentifier(email) },
      error,
    })
    return false
  }
}

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await sql`
      DELETE FROM email_verification_tokens 
      WHERE expires_at < NOW()
    `
  } catch (error) {
    logApiEvent("error", "auth.magic_link.cleanup_failed", {
      requestId: randomBytes(8).toString("hex"),
      route: "internal/magic-link",
      method: "INTERNAL",
      details: { outcome: "error" },
      error,
    })
  }
}
