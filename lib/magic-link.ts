import { neon } from "@neondatabase/serverless"
import { createHash, randomBytes } from "crypto"
import { sendEmail } from "./email"
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

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Magic Link Login</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">Magic Link Login</h1>
            <p style="color: #666; font-size: 16px; margin: 0;">Click the button below to sign in instantly</p>
          </div>
          
          ${userName ? `<p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>` : ""}
          
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            You requested a magic link to sign in to your account. Click the button below to sign in instantly - no password required!
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3); transition: all 0.3s ease;">
              Sign In with Magic Link
            </a>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 30px 0;">
            <p style="color: #666; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Security Notice:</p>
            <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
              <li>This link expires in 15 minutes</li>
              <li>It can only be used once</li>
              <li>If you didn't request this, you can safely ignore this email</li>
            </ul>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${magicLinkUrl}</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await sendEmail({
      to: email,
      subject: "Your Magic Link - Sign in instantly",
      html: emailHtml,
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
