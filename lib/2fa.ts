import { neon } from "@neondatabase/serverless"
import { randomBytes } from "crypto"
import * as speakeasy from "speakeasy"
import * as QRCode from "qrcode"
import { createEmailOTP, createSMSOTP } from "./otp"

const sql = neon(process.env.DATABASE_URL!)

export interface User2FASettings {
  id: number
  user_id: number
  is_enabled: boolean
  totp_secret?: string
  totp_enabled: boolean
  sms_enabled: boolean
  email_enabled: boolean
  backup_codes_generated_at?: Date
  backup_codes_used: number
  created_at: Date
  updated_at: Date
}

export interface BackupCode {
  id: number
  user_id: number
  code: string
  used_at?: Date
  created_at: Date
  is_active: boolean
}

// Generate TOTP secret and QR code
export async function generateTOTPSecret(
  userId: number,
  userEmail: string,
): Promise<{
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}> {
  try {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: "Runash.in",
      length: 32,
    })

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    return {
      secret: secret.base32,
      qrCodeUrl,
      manualEntryKey: secret.base32,
    }
  } catch {
    console.error("Error generating TOTP secret:", error)
    throw new Error("Failed to generate TOTP secret")
  }
}

// Verify TOTP code
export function verifyTOTPCode(secret: string, token: string, window = 1): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window, // Allow 1 step before/after for clock drift
    })
  } catch {
    console.error("Error verifying TOTP code:", error)
    return false
  }
}

// Setup 2FA for user
export async function setup2FA(
  userId: number,
  totpSecret?: string,
  enableSMS = false,
  enableEmail = false,
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO user_2fa_settings (
        user_id, totp_secret, totp_enabled, sms_enabled, email_enabled, is_enabled
      ) VALUES (
        ${userId}, 
        ${totpSecret || null}, 
        ${!!totpSecret}, 
        ${enableSMS}, 
        ${enableEmail},
        ${!!totpSecret || enableSMS || enableEmail}
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        totp_secret = COALESCE(${totpSecret}, user_2fa_settings.totp_secret),
        totp_enabled = ${!!totpSecret} OR user_2fa_settings.totp_enabled,
        sms_enabled = ${enableSMS} OR user_2fa_settings.sms_enabled,
        email_enabled = ${enableEmail} OR user_2fa_settings.email_enabled,
        is_enabled = (${!!totpSecret} OR user_2fa_settings.totp_enabled OR ${enableSMS} OR user_2fa_settings.sms_enabled OR ${enableEmail} OR user_2fa_settings.email_enabled),
        updated_at = NOW()
    `

    // Update users table
    await sql`
      UPDATE users 
      SET two_factor_enabled = true 
      WHERE id = ${userId}
    `

    return true
  } catch {
    console.error("Error setting up 2FA")
    return false
  }
}

// Get user's 2FA settings
export async function get2FASettings(userId: number): Promise<User2FASettings | null> {
  try {
    const result = await sql`
      SELECT * FROM user_2fa_settings WHERE user_id = ${userId}
    `

    return result.length > 0 ? (result[0] as User2FASettings) : null
  } catch {
    console.error("Error getting 2FA settings")
    return null
  }
}

// Generate backup codes
export async function generateBackupCodes(userId: number): Promise<string[]> {
  try {
    // Deactivate existing backup codes
    await sql`
      UPDATE user_2fa_backup_codes 
      SET is_active = false 
      WHERE user_id = ${userId}
    `

    // Generate 10 new backup codes
    const backupCodes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(5).toString("hex").toUpperCase()
      backupCodes.push(code)

      await sql`
        INSERT INTO user_2fa_backup_codes (user_id, code)
        VALUES (${userId}, ${code})
      `
    }

    // Update settings
    await sql`
      UPDATE user_2fa_settings 
      SET backup_codes_generated_at = NOW(), backup_codes_used = 0, updated_at = NOW()
      WHERE user_id = ${userId}
    `

    // Update users table
    await sql`
      UPDATE users 
      SET two_factor_backup_at = NOW()
      WHERE id = ${userId}
    `

    return backupCodes
  } catch {
    console.error("Error generating backup codes:", error)
    throw new Error("Failed to generate backup codes")
  }
}

// Verify backup code
export async function verifyBackupCode(userId: number, code: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT * FROM user_2fa_backup_codes 
      WHERE user_id = ${userId} AND code = ${code} AND is_active = true AND used_at IS NULL
    `

    if (result.length === 0) {
      return false
    }

    // Mark code as used
    await sql`
      UPDATE user_2fa_backup_codes 
      SET used_at = NOW() 
      WHERE id = ${result[0].id}
    `

    // Update usage count
    await sql`
      UPDATE user_2fa_settings 
      SET backup_codes_used = backup_codes_used + 1, updated_at = NOW()
      WHERE user_id = ${userId}
    `

    return true
  } catch {
    console.error("Error verifying backup code:", error)
    return false
  }
}

// Verify 2FA code (TOTP, SMS, Email, or Backup)
export async function verify2FACode(
  userId: number,
  code: string,
  method: "totp" | "sms" | "email" | "backup",
  identifier?: string, // email or phone for OTP methods
): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await get2FASettings(userId)
    if (!settings || !settings.is_enabled) {
      return { success: false, message: "2FA is not enabled for this user" }
    }

    switch (method) {
      case "totp":
        if (!settings.totp_enabled || !settings.totp_secret) {
          return { success: false, message: "TOTP is not enabled" }
        }
        const totpValid = verifyTOTPCode(settings.totp_secret, code)
        return {
          success: totpValid,
          message: totpValid ? "TOTP code verified" : "Invalid TOTP code",
        }

      case "sms":
        if (!settings.sms_enabled || !identifier) {
          return { success: false, message: "SMS 2FA is not enabled or phone number not provided" }
        }
        // Use existing OTP verification
        const smsResult = await import("./otp").then((otp) => otp.verifyOTP(code, identifier, "2fa_login", "sms"))
        return {
          success: smsResult.success,
          message: smsResult.message,
        }

      case "email":
        if (!settings.email_enabled || !identifier) {
          return { success: false, message: "Email 2FA is not enabled or email not provided" }
        }
        // Use existing OTP verification
        const emailResult = await import("./otp").then((otp) => otp.verifyOTP(code, identifier, "2fa_login", "email"))
        return {
          success: emailResult.success,
          message: emailResult.message,
        }

      case "backup":
        const backupValid = await verifyBackupCode(userId, code)
        return {
          success: backupValid,
          message: backupValid ? "Backup code verified" : "Invalid backup code",
        }

      default:
        return { success: false, message: "Invalid 2FA method" }
    }
  } catch {
    console.error("Error verifying 2FA code")
    return { success: false, message: "Failed to verify 2FA code" }
  }
}

// Send 2FA code via SMS or Email
export async function send2FACode(
  userId: number,
  method: "sms" | "email",
  identifier: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const settings = await get2FASettings(userId)
    if (!settings || !settings.is_enabled) {
      return { success: false, message: "2FA is not enabled for this user" }
    }

    if (method === "sms" && !settings.sms_enabled) {
      return { success: false, message: "SMS 2FA is not enabled" }
    }

    if (method === "email" && !settings.email_enabled) {
      return { success: false, message: "Email 2FA is not enabled" }
    }

    // Use existing OTP system
    if (method === "sms") {
      return await createSMSOTP(identifier, "2fa_login", userId)
    } else {
      return await createEmailOTP(identifier, "2fa_login", userId)
    }
  } catch {
    console.error("Error sending 2FA code")
    return { success: false, message: "Failed to send 2FA code" }
  }
}

// Disable 2FA for user
export async function disable2FA(userId: number): Promise<boolean> {
  try {
    // Disable 2FA settings
    await sql`
      UPDATE user_2fa_settings 
      SET is_enabled = false, totp_enabled = false, sms_enabled = false, email_enabled = false, updated_at = NOW()
      WHERE user_id = ${userId}
    `

    // Deactivate backup codes
    await sql`
      UPDATE user_2fa_backup_codes 
      SET is_active = false 
      WHERE user_id = ${userId}
    `

    // Update users table
    await sql`
      UPDATE users 
      SET two_factor_enabled = false 
      WHERE id = ${userId}
    `

    return true
  } catch {
    console.error("Error disabling 2FA")
    return false
  }
}

// Get backup codes status
export async function getBackupCodesStatus(userId: number): Promise<{
  total: number
  used: number
  remaining: number
  lastGenerated?: Date
}> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used,
        MAX(created_at) as last_generated
      FROM user_2fa_backup_codes 
      WHERE user_id = ${userId} AND is_active = true
    `

    const stats = result[0]
    return {
      total: Number.parseInt(stats.total) || 0,
      used: Number.parseInt(stats.used) || 0,
      remaining: (Number.parseInt(stats.total) || 0) - (Number.parseInt(stats.used) || 0),
      lastGenerated: stats.last_generated ? new Date(stats.last_generated) : undefined,
    }
  } catch {
    console.error("Error getting backup codes status:", error)
    return { total: 0, used: 0, remaining: 0 }
  }
}

// Log recovery attempt
export async function logRecoveryAttempt(
  userId: number,
  attemptType: "backup_code" | "recovery_email" | "admin_reset",
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  try {
    await sql`
      INSERT INTO user_2fa_recovery_attempts (user_id, attempt_type, success, ip_address, user_agent)
      VALUES (${userId}, ${attemptType}, ${success}, ${ipAddress || null}, ${userAgent || null})
    `
  } catch {
    console.error("Error logging recovery attempt:", error)
  }
}

// Check if user needs 2FA
export async function requiresTwoFactor(userId: number): Promise<boolean> {
  try {
    const result = await sql`
      SELECT two_factor_enabled FROM users WHERE id = ${userId}
    `

    return result.length > 0 && result[0].two_factor_enabled
  } catch {
    console.error("Error checking 2FA requirement")
    return false
  }
}
