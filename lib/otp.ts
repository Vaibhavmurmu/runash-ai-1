import { createHash, randomInt, randomUUID } from "crypto"
import { logApiEvent } from "./api/logging"
import { assertDatabaseConfigured, sql } from "./db"
import { sendAuthEmail } from "./email"

assertDatabaseConfigured("lib/otp.ts")

type OtpLogLevel = "info" | "warn" | "error"

type SqlClient = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<Record<string, any>>>


function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex").slice(0, 16)
}

function logOtpEvent(
  level: OtpLogLevel,
  event: string,
  requestId: string,
  details: Record<string, unknown>,
  error?: unknown,
) {
  logApiEvent(level, event, {
    requestId,
    route: "internal/otp",
    method: "INTERNAL",
    details,
    error,
  })
}

export interface OTPCode {
  id: number
  user_id?: number
  email?: string
  phone_number?: string
  code: string
  type: string
  purpose: string
  attempts: number
  max_attempts: number
  expires_at: Date
  used_at?: Date
  created_at: Date
  ip_address?: string
  user_agent?: string
  is_active: boolean
}

export interface OTPRateLimit {
  identifier: string
  type: string
  attempts: number
  blocked_until?: Date
}

// Generate a secure OTP code
export function generateOTPCode(length = 6): string {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += randomInt(0, 10).toString()
  }
  return code
}

// Check rate limiting for OTP requests
export async function checkOTPRateLimit(
  identifier: string,
  type: "email" | "sms" | "ip",
  maxAttempts = 5,
  windowMinutes = 15,
): Promise<{ allowed: boolean; attemptsLeft: number; blockedUntil?: Date }> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

    // Get or create rate limit record
    const rateLimitResult = await sql`
      INSERT INTO otp_rate_limits (identifier, type, attempts, window_start)
      VALUES (${identifier}, ${type}, 1, NOW())
      ON CONFLICT (identifier, type) 
      DO UPDATE SET 
        attempts = CASE 
          WHEN otp_rate_limits.window_start < ${windowStart} THEN 1
          ELSE otp_rate_limits.attempts + 1
        END,
        window_start = CASE 
          WHEN otp_rate_limits.window_start < ${windowStart} THEN NOW()
          ELSE otp_rate_limits.window_start
        END,
        blocked_until = CASE 
          WHEN otp_rate_limits.attempts + 1 > ${maxAttempts} THEN NOW() + INTERVAL '1 hour'
          ELSE otp_rate_limits.blocked_until
        END,
        updated_at = NOW()
      RETURNING *
    `

    const rateLimit = rateLimitResult[0]

    if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > new Date()) {
      return {
        allowed: false,
        attemptsLeft: 0,
        blockedUntil: new Date(rateLimit.blocked_until),
      }
    }

    const attemptsLeft = Math.max(0, maxAttempts - rateLimit.attempts)
    return {
      allowed: rateLimit.attempts <= maxAttempts,
      attemptsLeft,
    }
  } catch (error) {
    logOtpEvent("error", "otp.rate_limit.check_failed", randomUUID(), { outcome: "error", type }, error)
    return { allowed: false, attemptsLeft: 0 }
  }
}

// Create and send email OTP
export async function createEmailOTP(
  email: string,
  purpose: string,
  userId?: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  return createEmailOTPWithClient(sql, email, purpose, {
    userId,
    ipAddress,
    userAgent,
    deliverEmailOtp: sendEmailOTP,
  })
}

export async function createEmailOTPWithClient(
  sqlClient: SqlClient,
  email: string,
  purpose: string,
  options: {
    userId?: number
    ipAddress?: string
    userAgent?: string
    deliverEmailOtp?: (email: string, code: string, purpose: string) => Promise<boolean>
    checkRateLimit?: typeof checkOTPRateLimit
  } = {},
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const requestId = randomUUID()
  const deliverEmailOtp = options.deliverEmailOtp ?? sendEmailOTP
  const checkRateLimit = options.checkRateLimit ?? checkOTPRateLimit
  try {
    logOtpEvent("info", "otp.email.create.attempt", requestId, {
      outcome: "attempted",
      identifierHash: hashIdentifier(email),
      purpose,
      vendor: "email",
    })

    // Check rate limiting
    const rateLimit = await checkRateLimit(email, "email")
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.blockedUntil
          ? `Too many attempts. Try again after ${rateLimit.blockedUntil.toLocaleTimeString()}`
          : "Too many attempts. Please try again later.",
      }
    }

    // Deactivate existing OTP codes for this email and purpose
    await sqlClient`
      UPDATE otp_codes 
      SET is_active = false 
      WHERE email = ${email} AND purpose = ${purpose} AND is_active = true
    `

    // Generate new OTP code
    const code = generateOTPCode(6)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP code
    await sqlClient`
      INSERT INTO otp_codes (user_id, email, code, type, purpose, expires_at, ip_address, user_agent)
      VALUES (${options.userId || null}, ${email}, ${code}, 'email', ${purpose}, ${expiresAt}, ${options.ipAddress || null}, ${options.userAgent || null})
    `

    // Send email
    const emailSent = await deliverEmailOtp(email, code, purpose)

    if (!emailSent) {
      return { success: false, message: "Failed to send OTP email" }
    }

    logOtpEvent("info", "otp.email.create.success", requestId, {
      outcome: "sent",
      identifierHash: hashIdentifier(email),
      purpose,
      vendor: "email",
    })

    return {
      success: true,
      message: "OTP sent to your email",
      expiresIn: 10 * 60, // 10 minutes in seconds
    }
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.email.create_failed",
      requestId,
      { outcome: "error", identifierHash: hashIdentifier(email), purpose, vendor: "email" },
      error,
    )
    return { success: false, message: "Failed to create OTP" }
  }
}

// Create and send SMS OTP
export async function createSMSOTP(
  phoneNumber: string,
  purpose: string,
  userId?: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  return createSMSOTPWithClient(sql, phoneNumber, purpose, {
    userId,
    ipAddress,
    userAgent,
    deliverSmsOtp: sendSMSOTP,
  })
}

export async function createSMSOTPWithClient(
  sqlClient: SqlClient,
  phoneNumber: string,
  purpose: string,
  options: {
    userId?: number
    ipAddress?: string
    userAgent?: string
    deliverSmsOtp?: (phoneNumber: string, code: string, purpose: string) => Promise<boolean>
    checkRateLimit?: typeof checkOTPRateLimit
  } = {},
): Promise<{ success: boolean; message: string; expiresIn?: number }> {
  const requestId = randomUUID()
  const deliverSmsOtp = options.deliverSmsOtp ?? sendSMSOTP
  const checkRateLimit = options.checkRateLimit ?? checkOTPRateLimit
  try {
    logOtpEvent("info", "otp.sms.create.attempt", requestId, {
      outcome: "attempted",
      identifierHash: hashIdentifier(phoneNumber),
      purpose,
      vendor: "mock-sms",
    })

    // Check rate limiting
    const rateLimit = await checkRateLimit(phoneNumber, "sms")
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.blockedUntil
          ? `Too many attempts. Try again after ${rateLimit.blockedUntil.toLocaleTimeString()}`
          : "Too many attempts. Please try again later.",
      }
    }

    // Deactivate existing OTP codes for this phone and purpose
    await sqlClient`
      UPDATE otp_codes 
      SET is_active = false 
      WHERE phone_number = ${phoneNumber} AND purpose = ${purpose} AND is_active = true
    `

    // Generate new OTP code
    const code = generateOTPCode(6)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes (shorter for SMS)

    // Store OTP code
    await sqlClient`
      INSERT INTO otp_codes (user_id, phone_number, code, type, purpose, expires_at, ip_address, user_agent)
      VALUES (${options.userId || null}, ${phoneNumber}, ${code}, 'sms', ${purpose}, ${expiresAt}, ${options.ipAddress || null}, ${options.userAgent || null})
    `

    // Send SMS
    const smsSent = await deliverSmsOtp(phoneNumber, code, purpose)

    if (!smsSent) {
      return { success: false, message: "Failed to send SMS OTP" }
    }

    logOtpEvent("info", "otp.sms.create.success", requestId, {
      outcome: "sent",
      identifierHash: hashIdentifier(phoneNumber),
      purpose,
      vendor: "mock-sms",
    })

    return {
      success: true,
      message: "OTP sent to your phone",
      expiresIn: 5 * 60, // 5 minutes in seconds
    }
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.sms.create_failed",
      requestId,
      { outcome: "error", identifierHash: hashIdentifier(phoneNumber), purpose, vendor: "mock-sms" },
      error,
    )
    return { success: false, message: "Failed to create OTP" }
  }
}

// Verify OTP code
export async function verifyOTP(
  code: string,
  identifier: string, // email or phone number
  purpose: string,
  type: "email" | "sms",
): Promise<{ success: boolean; message: string; userId?: number }> {
  return verifyOTPWithClient(sql, code, identifier, purpose, type)
}

export async function verifyOTPWithClient(
  sqlClient: SqlClient,
  code: string,
  identifier: string, // email or phone number
  purpose: string,
  type: "email" | "sms",
): Promise<{ success: boolean; message: string; userId?: number }> {
  const requestId = randomUUID()
  try {
    const otpResult = await (type === "email"
      ? sqlClient`
          SELECT * FROM otp_codes 
          WHERE email = ${identifier} 
            AND code = ${code} 
            AND purpose = ${purpose} 
            AND type = ${type}
            AND is_active = true 
            AND expires_at > NOW()
            AND used_at IS NULL
          ORDER BY created_at DESC 
          LIMIT 1
        `
      : sqlClient`
          SELECT * FROM otp_codes 
          WHERE phone_number = ${identifier} 
            AND code = ${code} 
            AND purpose = ${purpose} 
            AND type = ${type}
            AND is_active = true 
            AND expires_at > NOW()
            AND used_at IS NULL
          ORDER BY created_at DESC 
          LIMIT 1
        `)

    logOtpEvent("info", "otp.verify.attempt", requestId, {
      outcome: otpResult.length > 0 ? "candidate_found" : "candidate_missing",
      type,
      purpose,
      identifierHash: hashIdentifier(identifier),
    })

    if (otpResult.length === 0) {
      return { success: false, message: "Invalid or expired OTP code" }
    }

    const otpRecord = otpResult[0]

    // Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return { success: false, message: "Too many failed attempts. Please request a new OTP." }
    }

    // Increment attempts
    await sqlClient`
      UPDATE otp_codes 
      SET attempts = attempts + 1 
      WHERE id = ${otpRecord.id}
    `

    // Mark as used
    await sqlClient`
      UPDATE otp_codes 
      SET used_at = NOW(), is_active = false 
      WHERE id = ${otpRecord.id}
    `

    // Clean up other active OTP codes for this identifier and purpose
    if (type === "email") {
      await sqlClient`
        UPDATE otp_codes 
        SET is_active = false 
        WHERE email = ${identifier} 
          AND purpose = ${purpose} 
          AND id != ${otpRecord.id}
      `
    } else {
      await sqlClient`
        UPDATE otp_codes 
        SET is_active = false 
        WHERE phone_number = ${identifier} 
          AND purpose = ${purpose} 
          AND id != ${otpRecord.id}
      `
    }

    const verifyResult = {
      success: true,
      message: "OTP verified successfully",
      userId: otpRecord.user_id,
    }

    logOtpEvent("info", "otp.verify.success", requestId, {
      outcome: "verified",
      type,
      purpose,
      identifierHash: hashIdentifier(identifier),
    })

    return verifyResult
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.verify.failed",
      requestId,
      { outcome: "error", type, purpose, identifierHash: hashIdentifier(identifier) },
      error,
    )
    return { success: false, message: "Failed to verify OTP" }
  }
}

// Send email OTP
async function sendEmailOTP(email: string, code: string, purpose: string): Promise<boolean> {
  const requestId = randomUUID()
  const subject = getEmailSubject(purpose)
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">Verification Code</h1>
            <p style="color: #666; font-size: 16px; margin: 0;">Enter this code to complete your ${purpose}</p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="display: inline-block; background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; font-size: 32px; font-weight: 700; padding: 20px 40px; border-radius: 12px; letter-spacing: 8px; font-family: 'Courier New', monospace; box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);">
              ${code}
            </div>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 30px 0;">
            <p style="color: #666; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Security Notice:</p>
            <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
              <li>This code expires in 10 minutes</li>
              <li>Don't share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            This verification code was sent to ${email}
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    await sendAuthEmail({
      to: email,
      subject,
      html: emailHtml,
    })
    return true
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.email.email_provider.send_failed",
      requestId,
      { outcome: "error", identifierHash: hashIdentifier(email), purpose, vendor: "email" },
      error,
    )
    return false
  }
}

// Send SMS OTP (placeholder - integrate with SMS service like Twilio)
async function sendSMSOTP(phoneNumber: string, code: string, purpose: string): Promise<boolean> {
  const requestId = randomUUID()
  const provider = "mock-sms"
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // For now, we'll log the SMS content
    logOtpEvent("info", "otp.sms.mock_sms.send_attempted", requestId, {
      vendor: provider,
      outcome: "simulated",
      purpose,
      identifierHash: hashIdentifier(phoneNumber),
      channel: "sms",
    })

    // In production, replace this with actual SMS service integration:
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    */

    return true
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.sms.mock_sms.send_failed",
      requestId,
      { vendor: provider, outcome: "error", purpose, identifierHash: hashIdentifier(phoneNumber) },
      error,
    )
    return false
  }
}

function getEmailSubject(purpose: string): string {
  switch (purpose) {
    case "login":
      return "Your Login Verification Code"
    case "registration":
      return "Complete Your Registration"
    case "password_reset":
      return "Password Reset Verification"
    case "2fa_setup":
      return "Two-Factor Authentication Setup"
    case "2fa_login":
      return "Two-Factor Authentication Code"
    default:
      return "Your Verification Code"
  }
}

// Clean up expired OTP codes
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    await sql`
      DELETE FROM otp_codes WHERE expires_at < NOW()
    `
    await sql`
      DELETE FROM otp_rate_limits 
      WHERE blocked_until IS NOT NULL AND blocked_until < NOW()
    `
  } catch (error) {
    logOtpEvent("error", "otp.cleanup.failed", randomUUID(), { outcome: "error" }, error)
  }
}

// Add or update mobile verification
export async function addMobileVerification(
  userId: number,
  phoneNumber: string,
  countryCode: string,
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO mobile_verifications (user_id, phone_number, country_code)
      VALUES (${userId}, ${phoneNumber}, ${countryCode})
      ON CONFLICT (user_id, phone_number) 
      DO UPDATE SET 
        country_code = ${countryCode},
        updated_at = NOW()
    `
    return true
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.mobile_verification.add_failed",
      randomUUID(),
      { outcome: "error", identifierHash: hashIdentifier(phoneNumber) },
      error,
    )
    return false
  }
}

// Verify mobile number
export async function verifyMobileNumber(userId: number, phoneNumber: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE mobile_verifications 
      SET is_verified = true, verified_at = NOW(), updated_at = NOW()
      WHERE user_id = ${userId} AND phone_number = ${phoneNumber}
    `
    return result.length > 0
  } catch (error) {
    logOtpEvent(
      "error",
      "otp.mobile_verification.verify_failed",
      randomUUID(),
      { outcome: "error", identifierHash: hashIdentifier(phoneNumber) },
      error,
    )
    return false
  }
}
