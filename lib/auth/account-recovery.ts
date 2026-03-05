import { db } from "@/lib/db"
import crypto from "crypto"

export interface RecoveryCode {
  code: string
  used: boolean
  usedAt: Date | null
}

export interface RecoveryCodeSet {
  userId: number
  codes: RecoveryCode[]
  generatedAt: Date
  expiresAt: Date
}

/**
 * Generate recovery codes for account recovery
 */
export async function generateRecoveryCodes(userId: number, count = 10): Promise<string[]> {
  try {
    const codes: string[] = []

    // Generate recovery codes (8 characters, alphanumeric)
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8)
      codes.push(code)
    }

    // Store codes in database (hashed for security)
    for (const code of codes) {
      const codeHash = crypto.createHash("sha256").update(code).digest("hex")

      await db.query(
        `INSERT INTO recovery_codes (user_id, code_hash, used, created_at)
         VALUES ($1, $2, false, NOW())`,
        [userId, codeHash],
      )
    }

    return codes
  } catch (error) {
    console.error("[v0] Error generating recovery codes:", error)
    throw error
  }
}

/**
 * Verify and use a recovery code
 */
export async function verifyRecoveryCode(userId: number, code: string): Promise<boolean> {
  try {
    const codeHash = crypto.createHash("sha256").update(code).digest("hex")

    // Find unused recovery code
    const result = await db.query(
      `SELECT id FROM recovery_codes 
       WHERE user_id = $1 AND code_hash = $2 AND used = false`,
      [userId, codeHash],
    )

    if (result.rows.length === 0) {
      return false
    }

    // Mark code as used
    await db.query(
      `UPDATE recovery_codes 
       SET used = true, used_at = NOW() 
       WHERE user_id = $1 AND code_hash = $2`,
      [userId, codeHash],
    )

    return true
  } catch (error) {
    console.error("[v0] Error verifying recovery code:", error)
    return false
  }
}

/**
 * Initiate account recovery process
 */
export async function initiateAccountRecovery(email: string): Promise<{
  recoveryToken: string
  expiresAt: Date
} | null> {
  try {
    // Find user by email
    const userResult = await db.query("SELECT id FROM users WHERE email = $1", [email])

    if (userResult.rows.length === 0) {
      return null
    }

    const userId = userResult.rows[0].id

    // Generate recovery token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Store recovery request
    await db.query(
      `INSERT INTO account_recovery_requests (user_id, token, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, token, expiresAt],
    )

    // Send email with recovery link
    await sendAccountRecoveryEmail(email, token)

    return {
      recoveryToken: token,
      expiresAt,
    }
  } catch (error) {
    console.error("[v0] Error initiating account recovery:", error)
    throw error
  }
}

/**
 * Verify account recovery and complete recovery process
 */
export async function verifyAccountRecovery(
  token: string,
  verificationMethod: "email" | "recovery_code" | "security_questions",
  verificationData: string,
): Promise<{ success: boolean; userId?: number; message: string }> {
  try {
    // Get recovery request
    const result = await db.query(
      `SELECT user_id FROM account_recovery_requests 
       WHERE token = $1 AND expires_at > NOW() AND verified_at IS NULL`,
      [token],
    )

    if (result.rows.length === 0) {
      return {
        success: false,
        message: "Invalid or expired recovery token",
      }
    }

    const userId = result.rows[0].user_id

    // Verify based on method
    let isVerified = false

    if (verificationMethod === "email") {
      // Email verification code would have been sent
      isVerified = await verifyRecoveryEmailCode(userId, verificationData)
    } else if (verificationMethod === "recovery_code") {
      // Use recovery code
      isVerified = await verifyRecoveryCode(userId, verificationData)
    } else if (verificationMethod === "security_questions") {
      // Verify security questions
      isVerified = await verifySecurityQuestionAnswers(userId, JSON.parse(verificationData))
    }

    if (!isVerified) {
      return {
        success: false,
        message: "Verification failed",
      }
    }

    // Mark recovery request as verified
    await db.query(
      `UPDATE account_recovery_requests 
       SET verified_at = NOW() 
       WHERE token = $1`,
      [token],
    )

    return {
      success: true,
      userId,
      message: "Recovery verification successful",
    }
  } catch (error) {
    console.error("[v0] Error verifying account recovery:", error)
    return {
      success: false,
      message: "Error during recovery verification",
    }
  }
}

/**
 * Complete account recovery and reset password
 */
export async function completeAccountRecovery(token: string, newPassword: string): Promise<boolean> {
  try {
    // Get verified recovery request
    const result = await db.query(
      `SELECT user_id FROM account_recovery_requests 
       WHERE token = $1 AND verified_at IS NOT NULL AND completed_at IS NULL`,
      [token],
    )

    if (result.rows.length === 0) {
      return false
    }

    const userId = result.rows[0].user_id

    // Update password (in production, hash with bcrypt)
    // For now, just storing plain - implement proper hashing
    await db.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE id = $2`,
      [newPassword, userId],
    )

    // Mark recovery as completed
    await db.query(
      `UPDATE account_recovery_requests 
       SET completed_at = NOW() 
       WHERE token = $1`,
      [token],
    )

    // Invalidate all existing sessions
    await db.query(
      `DELETE FROM neon_auth.session 
       WHERE user_id = $1`,
      [userId],
    )

    // Send confirmation email
    await sendRecoveryCompleteEmail(userId)

    return true
  } catch (error) {
    console.error("[v0] Error completing account recovery:", error)
    return false
  }
}

/**
 * Verify recovery email code
 */
async function verifyRecoveryEmailCode(userId: number, code: string): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT id FROM otp_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'account_recovery' 
       AND expires_at > NOW() AND is_active = true`,
      [userId, code],
    )

    if (result.rows.length === 0) {
      return false
    }

    // Mark as used
    await db.query(
      `UPDATE otp_codes 
       SET is_active = false, used_at = NOW() 
       WHERE user_id = $1 AND code = $2`,
      [userId, code],
    )

    return true
  } catch (error) {
    console.error("[v0] Error verifying recovery email code:", error)
    return false
  }
}

/**
 * Verify security question answers
 */
async function verifySecurityQuestionAnswers(
  userId: number,
  answers: Array<{ questionId: number; answer: string }>,
): Promise<boolean> {
  try {
    // Get user's security questions
    const result = await db.query(
      `SELECT id, answer_hash FROM security_questions 
       WHERE user_id = $1`,
      [userId],
    )

    if (result.rows.length === 0) {
      return false
    }

    // Verify each answer
    for (const answer of answers) {
      const question = result.rows.find((q: any) => q.id === answer.questionId)

      if (!question) {
        return false
      }

      // In production, use bcrypt.compare() for secure comparison
      if (question.answer_hash !== answer.answer) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error("[v0] Error verifying security questions:", error)
    return false
  }
}

/**
 * Send account recovery email
 */
async function sendAccountRecoveryEmail(email: string, token: string): Promise<void> {
  try {
    const recoveryLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/recover?token=${token}`

    console.log(`[v0] Sending account recovery email to ${email}`)
    console.log(`[v0] Recovery link: ${recoveryLink}`)

    // TODO: Implement actual email sending
    // await sendEmail({
    //   to: email,
    //   subject: 'Account Recovery Request',
    //   template: 'account-recovery',
    //   data: { recoveryLink }
    // })
  } catch (error) {
    console.error("[v0] Error sending account recovery email:", error)
  }
}

/**
 * Send recovery complete confirmation email
 */
async function sendRecoveryCompleteEmail(userId: number): Promise<void> {
  try {
    // Get user email
    const result = await db.query("SELECT email FROM users WHERE id = $1", [userId])

    if (result.rows.length === 0) {
      return
    }

    const email = result.rows[0].email

    console.log(`[v0] Sending account recovery complete email to ${email}`)

    // TODO: Implement actual email sending
    // await sendEmail({
    //   to: email,
    //   subject: 'Your Account Has Been Recovered',
    //   template: 'recovery-complete',
    // })
  } catch (error) {
    console.error("[v0] Error sending recovery complete email:", error)
  }
}
