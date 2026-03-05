import { db } from "@/lib/db"
import {
  analyzeLoginPattern,
  generateDeviceFingerprint,
  type SessionAnalysisResult,
} from "@/lib/auth/session-analysis"
import { getIpGeolocation, type LocationData } from "@/lib/geo"

export interface SuspiciousLoginChallenge {
  sessionId: string
  userId: number
  challengeType: "email_verification" | "totp" | "security_questions" | "none"
  challengeToken: string
  expiresAt: Date
  ipAddress: string
  location: LocationData | null
  riskScore: number
  reasons: string[]
}

/**
 * Detect and generate challenge for suspicious login
 */
export async function detectAndChallengeLogin(
  userId: number,
  ipAddress: string,
  userAgent: string,
): Promise<{ analysis: SessionAnalysisResult; challenge: SuspiciousLoginChallenge | null }> {
  // Get geolocation for IP
  const location = await getIpGeolocation(ipAddress)

  // Analyze the login pattern
  const analysis = await analyzeLoginPattern(userId, location || getFallbackLocation(), ipAddress, userAgent)

  let challenge: SuspiciousLoginChallenge | null = null

  // Generate challenge if suspicious
  if (analysis.isSuspicious) {
    challenge = await generateLoginChallenge(userId, analysis, ipAddress, location)
  }

  return {
    analysis,
    challenge,
  }
}

/**
 * Generate a challenge for suspicious login
 */
async function generateLoginChallenge(
  userId: number,
  analysis: SessionAnalysisResult,
  ipAddress: string,
  location: LocationData | null,
): Promise<SuspiciousLoginChallenge> {
  const challengeToken = crypto.randomUUID()
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Determine challenge type based on risk
  let challengeType: "email_verification" | "totp" | "security_questions" | "none" =
    "email_verification"

  if (analysis.riskScore >= 50) {
    // High risk: require email verification + TOTP if available
    challengeType = "totp"
  } else if (analysis.riskScore >= 25) {
    // Medium risk: email verification
    challengeType = "email_verification"
  }

  // Store challenge in database
  await storeLoginChallenge(sessionId, userId, challengeToken, challengeType, expiresAt)

  // Record the suspicious login attempt
  await recordSuspiciousLoginAttempt(userId, ipAddress, analysis)

  // Send notification to user
  await notifyUserOfSuspiciousLogin(userId, location, analysis)

  return {
    sessionId,
    userId,
    challengeType,
    challengeToken,
    expiresAt,
    ipAddress,
    location,
    riskScore: analysis.riskScore,
    reasons: analysis.reasons,
  }
}

/**
 * Store login challenge in database
 */
async function storeLoginChallenge(
  sessionId: string,
  userId: number,
  token: string,
  type: string,
  expiresAt: Date,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO login_challenges (session_id, user_id, token, type, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [sessionId, userId, token, type, expiresAt],
    )
  } catch (error) {
    console.error("[v0] Error storing login challenge:", error)
  }
}

/**
 * Verify a login challenge
 */
export async function verifyLoginChallenge(
  sessionId: string,
  token: string,
  verificationCode: string,
  challengeType: string,
): Promise<boolean> {
  try {
    // Get challenge from database
    const result = await db.query(
      `SELECT * FROM login_challenges 
       WHERE session_id = $1 AND token = $2 AND type = $3 AND expires_at > NOW() AND verified_at IS NULL`,
      [sessionId, token, challengeType],
    )

    if (result.rows.length === 0) {
      return false
    }

    const challenge = result.rows[0]

    // Verify the code based on challenge type
    let isVerified = false

    if (challengeType === "email_verification") {
      isVerified = await verifyEmailCode(challenge.user_id, verificationCode)
    } else if (challengeType === "totp") {
      isVerified = await verifyTotpCode(challenge.user_id, verificationCode)
    } else if (challengeType === "security_questions") {
      isVerified = await verifySecurityQuestionAnswer(challenge.user_id, verificationCode)
    }

    if (isVerified) {
      // Mark challenge as verified
      await db.query(
        `UPDATE login_challenges 
         SET verified_at = NOW() 
         WHERE session_id = $1`,
        [sessionId],
      )

      return true
    }

    return false
  } catch (error) {
    console.error("[v0] Error verifying login challenge:", error)
    return false
  }
}

/**
 * Record suspicious login attempt
 */
async function recordSuspiciousLoginAttempt(
  userId: number,
  ipAddress: string,
  analysis: SessionAnalysisResult,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO suspicious_logins (user_id, ip_address, risk_score, reasons, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, ipAddress, analysis.riskScore, JSON.stringify(analysis.reasons)],
    )
  } catch (error) {
    console.error("[v0] Error recording suspicious login:", error)
  }
}

/**
 * Notify user of suspicious login
 */
async function notifyUserOfSuspiciousLogin(
  userId: number,
  location: LocationData | null,
  analysis: SessionAnalysisResult,
): Promise<void> {
  try {
    // Get user email
    const userResult = await db.query("SELECT email FROM users WHERE id = $1", [userId])

    if (userResult.rows.length === 0) {
      return
    }

    const email = userResult.rows[0].email
    const locationStr = location ? `${location.city}, ${location.country}` : "Unknown location"

    // Send email notification
    // In production, use your email service (SendGrid, PostMark, etc.)
    // For now, just log it
    console.log(
      `[v0] Sending suspicious login notification to ${email} from ${locationStr} with risk score ${analysis.riskScore}`,
    )

    // TODO: Implement actual email sending
    // await sendEmail({
    //   to: email,
    //   subject: 'Suspicious login detected',
    //   template: 'suspicious-login-notification',
    //   data: {
    //     location: locationStr,
    //     riskScore: analysis.riskScore,
    //     reasons: analysis.reasons,
    //   }
    // })
  } catch (error) {
    console.error("[v0] Error notifying user of suspicious login:", error)
  }
}

/**
 * Verify email verification code
 */
async function verifyEmailCode(userId: number, code: string): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT * FROM otp_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'suspicious_login' 
       AND expires_at > NOW() AND is_active = true`,
      [userId, code],
    )

    if (result.rows.length > 0) {
      // Mark code as used
      await db.query(
        `UPDATE otp_codes 
         SET is_active = false, used_at = NOW() 
         WHERE user_id = $1 AND code = $2`,
        [userId, code],
      )

      return true
    }

    return false
  } catch (error) {
    console.error("[v0] Error verifying email code:", error)
    return false
  }
}

/**
 * Verify TOTP code
 */
async function verifyTotpCode(userId: number, code: string): Promise<boolean> {
  try {
    // Get user's TOTP secret
    const result = await db.query(
      `SELECT totp_secret FROM user_2fa_settings 
       WHERE user_id = $1 AND totp_enabled = true`,
      [userId],
    )

    if (result.rows.length === 0) {
      return false
    }

    const secret = result.rows[0].totp_secret

    // Verify TOTP code using speakeasy or similar library
    // For now, just return false - implement with actual TOTP library
    // import speakeasy from 'speakeasy'
    // const verified = speakeasy.totp.verify({
    //   secret: secret,
    //   encoding: 'base32',
    //   token: code,
    //   window: 1
    // })

    return false // TODO: Implement actual TOTP verification
  } catch (error) {
    console.error("[v0] Error verifying TOTP code:", error)
    return false
  }
}

/**
 * Verify security question answer
 */
async function verifySecurityQuestionAnswer(userId: number, answer: string): Promise<boolean> {
  // TODO: Implement security questions verification
  return false
}

/**
 * Get fallback location when geolocation fails
 */
function getFallbackLocation(): LocationData {
  return {
    latitude: 0,
    longitude: 0,
    city: "Unknown",
    region: "",
    country: "Unknown",
    timezone: "UTC",
    isp: "Unknown",
  }
}

/**
 * Check if login should be blocked based on historical pattern
 */
export async function shouldBlockLogin(userId: number): Promise<boolean> {
  try {
    // Check for repeated failed attempts in last hour
    const result = await db.query(
      `SELECT COUNT(*) as count FROM suspicious_logins 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId],
    )

    const count = parseInt(result.rows[0].count, 10)

    // Block if more than 5 suspicious logins in an hour
    return count > 5
  } catch (error) {
    console.error("[v0] Error checking login block status:", error)
    return false
  }
}
