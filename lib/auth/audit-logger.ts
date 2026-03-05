import { db } from "@/lib/db"
import type { AuditEvent } from "@/lib/auth/security-monitor"

export interface ComplianceReport {
  period: {
    startDate: Date
    endDate: Date
  }
  totalEvents: number
  eventsByAction: Record<string, number>
  failureCount: number
  failureRate: number
  userActivity: {
    activeUsers: number
    newUsers: number
  }
  securityEvents: {
    suspiciousLogins: number
    failedAttempts: number
    mfaSetups: number
  }
  dataAccess: {
    dataExports: number
    profileChanges: number
  }
}

/**
 * Log authentication event for compliance
 */
export async function logAuthEvent(
  userId: number,
  action: "login" | "logout" | "password_reset" | "mfa_setup" | "mfa_disable",
  metadata: Record<string, any>,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_events (user_id, action, resource, resource_id, status, ip_address, user_agent, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [userId, action, "authentication", `user_${userId}`, "success", ipAddress, userAgent, JSON.stringify(metadata)],
    )
  } catch (error) {
    console.error("[v0] Error logging auth event:", error)
  }
}

/**
 * Log account modification for audit trail
 */
export async function logAccountModification(
  userId: number,
  modification: "email_changed" | "password_changed" | "profile_updated" | "mfa_changed",
  changes: Record<string, { oldValue: any; newValue: any }>,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_events (user_id, action, resource, resource_id, changes, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, modification, "account", `user_${userId}`, JSON.stringify(changes), ipAddress, userAgent],
    )
  } catch (error) {
    console.error("[v0] Error logging account modification:", error)
  }
}

/**
 * Log data access for GDPR/CCPA compliance
 */
export async function logDataAccess(
  userId: number,
  dataType: "personal_data" | "usage_data" | "payment_data",
  action: "view" | "download" | "delete",
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_events (user_id, action, resource, resource_id, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, `data_${action}`, dataType, `user_${userId}`, ipAddress, userAgent],
    )
  } catch (error) {
    console.error("[v0] Error logging data access:", error)
  }
}

/**
 * Generate compliance report (GDPR, CCPA, SOC 2)
 */
export async function generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
  try {
    // Get total events
    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_events 
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate],
    )

    const totalEvents = parseInt(totalResult.rows[0].total, 10)

    // Get events by action
    const actionResult = await db.query(
      `SELECT action, COUNT(*) as count FROM audit_events 
       WHERE created_at >= $1 AND created_at <= $2 
       GROUP BY action`,
      [startDate, endDate],
    )

    const eventsByAction: Record<string, number> = {}
    for (const row of actionResult.rows) {
      eventsByAction[row.action] = parseInt(row.count, 10)
    }

    // Get failure rate
    const failureResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_events 
       WHERE created_at >= $1 AND created_at <= $2 AND status = 'failure'`,
      [startDate, endDate],
    )

    const failureCount = parseInt(failureResult.rows[0].total, 10)
    const failureRate = totalEvents > 0 ? (failureCount / totalEvents) * 100 : 0

    // Get active users
    const usersResult = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM audit_events 
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate],
    )

    const activeUsers = parseInt(usersResult.rows[0].count, 10)

    // Get new users (registered in period)
    const newUsersResult = await db.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate],
    )

    const newUsers = parseInt(newUsersResult.rows[0].count, 10)

    // Get suspicious logins
    const suspiciousResult = await db.query(
      `SELECT COUNT(*) as count FROM suspicious_logins 
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate],
    )

    const suspiciousLogins = parseInt(suspiciousResult.rows[0].count, 10)

    return {
      period: { startDate, endDate },
      totalEvents,
      eventsByAction,
      failureCount,
      failureRate,
      userActivity: {
        activeUsers,
        newUsers,
      },
      securityEvents: {
        suspiciousLogins,
        failedAttempts: failureCount,
        mfaSetups: eventsByAction["mfa_setup"] || 0,
      },
      dataAccess: {
        dataExports: eventsByAction["data_download"] || 0,
        profileChanges: eventsByAction["profile_updated"] || 0,
      },
    }
  } catch (error) {
    console.error("[v0] Error generating compliance report:", error)
    throw error
  }
}

/**
 * Get audit trail for a specific user (for user data export - GDPR)
 */
export async function getUserAuditTrail(userId: number): Promise<AuditEvent[]> {
  try {
    const result = await db.query(
      `SELECT * FROM audit_events 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1000`,
      [userId],
    )

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      status: row.status,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      timestamp: row.created_at,
    }))
  } catch (error) {
    console.error("[v0] Error getting user audit trail:", error)
    return []
  }
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanupOldAuditLogs(retentionDays = 365): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

    const result = await db.query(
      `DELETE FROM audit_events 
       WHERE created_at < $1 
       AND action NOT IN ('data_download', 'data_delete') -- Keep sensitive operations longer`,
      [cutoffDate],
    )

    return result.rowCount || 0
  } catch (error) {
    console.error("[v0] Error cleaning up audit logs:", error)
    return 0
  }
}

/**
 * Generate GDPR data export for user
 */
export async function generateGdprDataExport(userId: number): Promise<{
  personalData: any
  auditTrail: AuditEvent[]
  consentRecords: any[]
}> {
  try {
    // Get user personal data
    const userResult = await db.query("SELECT * FROM users WHERE id = $1", [userId])

    const personalData = userResult.rows[0] || {}

    // Get audit trail
    const auditTrail = await getUserAuditTrail(userId)

    // Get consent records
    const consentResult = await db.query(
      `SELECT * FROM user_consents 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId],
    )

    const consentRecords = consentResult.rows || []

    // Log this data export
    await logDataAccess(userId, "personal_data", "download", "internal", "GDPR_Export")

    return {
      personalData,
      auditTrail,
      consentRecords,
    }
  } catch (error) {
    console.error("[v0] Error generating GDPR data export:", error)
    throw error
  }
}

/**
 * Right to be forgotten - prepare user for deletion
 */
export async function initiateDeletion(userId: number, reason?: string): Promise<{
  deletionScheduledFor: Date
  gracePeriod: number
}> {
  try {
    const gracePeriod = 30 // days
    const deletionScheduledFor = new Date(Date.now() + gracePeriod * 24 * 60 * 60 * 1000)

    // Create deletion request record
    await db.query(
      `INSERT INTO user_deletions (user_id, deletion_scheduled_for, reason, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())`,
      [userId, deletionScheduledFor, reason || "User requested deletion"],
    )

    // Log the deletion request
    await logDataAccess(userId, "personal_data", "delete", "user_request", "Account deletion initiated")

    return {
      deletionScheduledFor,
      gracePeriod,
    }
  } catch (error) {
    console.error("[v0] Error initiating deletion:", error)
    throw error
  }
}

/**
 * Cancel scheduled deletion
 */
export async function cancelDeletion(userId: number): Promise<boolean> {
  try {
    const result = await db.query(
      `UPDATE user_deletions 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId],
    )

    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error("[v0] Error cancelling deletion:", error)
    return false
  }
}
