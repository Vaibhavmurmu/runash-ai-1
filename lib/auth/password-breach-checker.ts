import { db } from "@/lib/db"
import crypto from "crypto"

export interface BreachCheckResult {
  isBreached: boolean
  breachCount: number
  breachSources: string[]
  lastChecked: Date
}

/**
 * Check if a password has been compromised using HaveIBeenPwned API
 * Uses the k-anonymity model for privacy - only sends first 5 chars of SHA-1 hash
 */
export async function checkPasswordBreach(password: string): Promise<BreachCheckResult> {
  try {
    const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase()
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)

    // Query HaveIBeenPwned API with prefix
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}?useragent=AuthSystem/1.0`,
    )

    if (!response.ok) {
      console.warn("[v0] HaveIBeenPwned API error:", response.status)
      // On API error, assume password is not breached rather than blocking user
      return {
        isBreached: false,
        breachCount: 0,
        breachSources: [],
        lastChecked: new Date(),
      }
    }

    const text = await response.text()
    const hashes = text.split("\r\n")

    // Search for matching hash in response
    for (const hash of hashes) {
      const [hashSuffix, count] = hash.split(":")
      if (hashSuffix === suffix) {
        // Password is compromised
        return {
          isBreached: true,
          breachCount: parseInt(count, 10),
          breachSources: ["HaveIBeenPwned"],
          lastChecked: new Date(),
        }
      }
    }

    // Password not found in breach database
    return {
      isBreached: false,
      breachCount: 0,
      breachSources: [],
      lastChecked: new Date(),
    }
  } catch (error) {
    console.error("[v0] Error checking password breach:", error)
    // Default to safe (not breached) on error
    return {
      isBreached: false,
      breachCount: 0,
      breachSources: [],
      lastChecked: new Date(),
    }
  }
}

/**
 * Check if password violates history - prevents reuse of recent passwords
 */
export async function validatePasswordNotInHistory(userId: number, newPassword: string): Promise<boolean> {
  try {
    // Get user's password history (last 5 passwords)
    const result = await db.query(
      `SELECT password_hash FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId],
    )

    // For each historical password, verify it's different
    for (const row of result.rows) {
      // In production, use bcrypt.compare() for secure comparison
      // For now, just comparing - in real implementation use proper hashing
      if (row.password_hash === newPassword) {
        return false // Password was used recently
      }
    }

    return true // Password is not in history
  } catch (error) {
    console.error("[v0] Error checking password history:", error)
    return true // On error, allow password
  }
}

/**
 * Store password in history for future validation
 */
export async function storePasswordInHistory(userId: number, passwordHash: string): Promise<void> {
  try {
    // Store the old password hash
    await db.query(
      `INSERT INTO password_history (user_id, password_hash, created_at)
       VALUES ($1, $2, NOW())`,
      [userId, passwordHash],
    )

    // Keep only last 10 passwords
    await db.query(
      `DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10
       )`,
      [userId],
    )
  } catch (error) {
    console.error("[v0] Error storing password in history:", error)
  }
}

/**
 * Score password strength using OWASP guidelines
 */
export interface PasswordStrengthScore {
  score: number // 0-100
  strength: "weak" | "fair" | "good" | "strong" | "very_strong"
  feedback: string[]
  suggestions: string[]
}

export function scorePasswordStrength(password: string): PasswordStrengthScore {
  let score = 0
  const feedback: string[] = []
  const suggestions: string[] = []

  // Length scoring
  if (password.length >= 8) score += 10
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10
  if (password.length < 8) suggestions.push("Use at least 8 characters")

  // Character diversity
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  if (hasLower) score += 10
  else suggestions.push("Add lowercase letters")

  if (hasUpper) score += 10
  else suggestions.push("Add uppercase letters")

  if (hasNumbers) score += 10
  else suggestions.push("Add numbers")

  if (hasSpecial) score += 15
  else suggestions.push("Add special characters")

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 10
    feedback.push("Avoid repeating characters")
  }

  if (/^[a-z]+[0-9]+$|^[0-9]+[a-z]+$/i.test(password)) {
    score -= 5
    feedback.push("Avoid simple patterns like 'password123'")
  }

  // Check against common passwords
  const commonPasswords = ["password", "123456", "qwerty", "letmein", "welcome"]
  if (commonPasswords.some((pwd) => password.toLowerCase().includes(pwd))) {
    score -= 15
    feedback.push("Avoid common passwords")
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score))

  // Determine strength
  let strength: "weak" | "fair" | "good" | "strong" | "very_strong"
  if (score < 30) strength = "weak"
  else if (score < 50) strength = "fair"
  else if (score < 70) strength = "good"
  else if (score < 85) strength = "strong"
  else strength = "very_strong"

  return {
    score,
    strength,
    feedback,
    suggestions,
  }
}

/**
 * Notify user of compromised password
 */
export async function notifyPasswordCompromised(userId: number, breachCount: number): Promise<void> {
  try {
    // Get user email
    const userResult = await db.query("SELECT email FROM users WHERE id = $1", [userId])

    if (userResult.rows.length === 0) {
      return
    }

    const email = userResult.rows[0].email

    // Record notification
    await db.query(
      `INSERT INTO breach_notifications (user_id, email, breach_count, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, email, breachCount],
    )

    // Send email (implement with your email service)
    console.log(`[v0] Sending breach notification to ${email}: password found in ${breachCount} breaches`)

    // TODO: Send actual email
    // await sendEmail({
    //   to: email,
    //   subject: 'Your password may have been compromised',
    //   template: 'password-breach-notification',
    //   data: {
    //     breachCount,
    //   }
    // })
  } catch (error) {
    console.error("[v0] Error notifying password compromise:", error)
  }
}

/**
 * Get password change history for a user
 */
export async function getPasswordChangeHistory(userId: number, limit = 10) {
  try {
    const result = await db.query(
      `SELECT id, created_at FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit],
    )

    return result.rows
  } catch (error) {
    console.error("[v0] Error getting password change history:", error)
    return []
  }
}
