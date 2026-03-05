import { db } from "@/lib/db"

export interface SecurityThreat {
  id: string
  type: "brute_force" | "credential_stuffing" | "suspicious_activity" | "account_compromise" | "ddos"
  severity: "low" | "medium" | "high" | "critical"
  description: string
  sourceIp?: string
  targetUserId?: number
  riskScore: number
  detectedAt: Date
  resolvedAt?: Date
  metadata: Record<string, any>
}

export interface AuditEvent {
  id: string
  userId: number
  action: string // login, logout, password_change, mfa_setup, account_update, etc.
  resource: string // user, session, account, etc.
  resourceId: string
  status: "success" | "failure"
  ipAddress: string
  userAgent: string
  changes?: Record<string, { oldValue: any; newValue: any }>
  metadata?: Record<string, any>
  timestamp: Date
}

/**
 * Detect potential security threats in real-time
 */
export async function detectSecurityThreat(
  userId: number,
  action: string,
  metadata: Record<string, any>,
): Promise<SecurityThreat | null> {
  try {
    // Check for brute force attacks (multiple failed logins)
    const bruteForceCheck = await checkBruteForce(userId, metadata.ipAddress)
    if (bruteForceCheck) {
      return bruteForceCheck
    }

    // Check for credential stuffing (multiple accounts from same IP)
    const credentialStuffingCheck = await checkCredentialStuffing(metadata.ipAddress)
    if (credentialStuffingCheck) {
      return credentialStuffingCheck
    }

    // Check for account compromise indicators
    const compromiseCheck = await checkAccountCompromise(userId, action, metadata)
    if (compromiseCheck) {
      return compromiseCheck
    }

    return null
  } catch (error) {
    console.error("[v0] Error detecting security threat:", error)
    return null
  }
}

/**
 * Check for brute force attacks (multiple failed login attempts)
 */
async function checkBruteForce(userId: number, ipAddress: string): Promise<SecurityThreat | null> {
  try {
    // Count failed login attempts in last 15 minutes
    const result = await db.query(
      `SELECT COUNT(*) as count FROM login_challenges 
       WHERE user_id = $1 AND ip_address = $2 AND verified_at IS NULL 
       AND created_at > NOW() - INTERVAL '15 minutes'`,
      [userId, ipAddress],
    )

    const failureCount = parseInt(result.rows[0].count, 10)

    if (failureCount >= 5) {
      const threat: SecurityThreat = {
        id: crypto.randomUUID(),
        type: "brute_force",
        severity: failureCount >= 10 ? "critical" : "high",
        description: `${failureCount} failed login attempts detected for user ${userId} from IP ${ipAddress}`,
        sourceIp: ipAddress,
        targetUserId: userId,
        riskScore: Math.min(100, failureCount * 10),
        detectedAt: new Date(),
        metadata: { failureCount, ipAddress },
      }

      await recordSecurityThreat(threat)
      return threat
    }

    return null
  } catch (error) {
    console.error("[v0] Error checking for brute force:", error)
    return null
  }
}

/**
 * Check for credential stuffing (multiple failed logins from same IP for different users)
 */
async function checkCredentialStuffing(ipAddress: string): Promise<SecurityThreat | null> {
  try {
    // Count failed login attempts from this IP across different users in last hour
    const result = await db.query(
      `SELECT COUNT(DISTINCT user_id) as user_count FROM login_challenges 
       WHERE ip_address = $1 AND verified_at IS NULL 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [ipAddress],
    )

    const distinctUserCount = parseInt(result.rows[0].user_count, 10)

    // If 10+ different users failed login from same IP in 1 hour, likely credential stuffing
    if (distinctUserCount >= 10) {
      const threat: SecurityThreat = {
        id: crypto.randomUUID(),
        type: "credential_stuffing",
        severity: "critical",
        description: `Credential stuffing attack detected from IP ${ipAddress} targeting ${distinctUserCount} different user accounts`,
        sourceIp: ipAddress,
        riskScore: 95,
        detectedAt: new Date(),
        metadata: { distinctUserCount, ipAddress },
      }

      await recordSecurityThreat(threat)
      return threat
    }

    return null
  } catch (error) {
    console.error("[v0] Error checking for credential stuffing:", error)
    return null
  }
}

/**
 * Check for account compromise indicators
 */
async function checkAccountCompromise(
  userId: number,
  action: string,
  metadata: Record<string, any>,
): Promise<SecurityThreat | null> {
  try {
    // Get user's typical login behavior
    const behaviorResult = await db.query(
      `SELECT AVG(EXTRACT(HOUR FROM timestamp AT TIME ZONE 'UTC')) as avg_hour,
              COUNT(*) as total_logins
       FROM session_locations 
       WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
       GROUP BY user_id`,
      [userId],
    )

    if (behaviorResult.rows.length === 0) {
      return null // Not enough history
    }

    const avgLoginHour = Math.floor(behaviorResult.rows[0].avg_hour)
    const currentHour = new Date().getHours()

    // If login at unusual hour (differs by 6+ hours), might indicate compromise
    const hourDiff = Math.abs(currentHour - avgLoginHour)
    if (hourDiff > 6 && hourDiff < 18) {
      const threat: SecurityThreat = {
        id: crypto.randomUUID(),
        type: "account_compromise",
        severity: "medium",
        description: `Unusual login time detected for user ${userId}. Average: ${avgLoginHour}:00, Current: ${currentHour}:00`,
        targetUserId: userId,
        riskScore: 35,
        detectedAt: new Date(),
        metadata: { avgLoginHour, currentHour, hourDiff },
      }

      await recordSecurityThreat(threat)
      return threat
    }

    return null
  } catch (error) {
    console.error("[v0] Error checking for account compromise:", error)
    return null
  }
}

/**
 * Log audit event for compliance and monitoring
 */
export async function logAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
  try {
    const id = crypto.randomUUID()

    await db.query(
      `INSERT INTO audit_events (id, user_id, action, resource, resource_id, status, ip_address, user_agent, changes, metadata, timestamp, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        id,
        event.userId,
        event.action,
        event.resource,
        event.resourceId,
        event.status,
        event.ipAddress,
        event.userAgent,
        event.changes ? JSON.stringify(event.changes) : null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.timestamp,
      ],
    )
  } catch (error) {
    console.error("[v0] Error logging audit event:", error)
  }
}

/**
 * Record a security threat
 */
async function recordSecurityThreat(threat: SecurityThreat): Promise<void> {
  try {
    await db.query(
      `INSERT INTO security_threats (id, type, severity, description, source_ip, target_user_id, risk_score, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        threat.id,
        threat.type,
        threat.severity,
        threat.description,
        threat.sourceIp,
        threat.targetUserId,
        threat.riskScore,
        JSON.stringify(threat.metadata),
      ],
    )
  } catch (error) {
    console.error("[v0] Error recording security threat:", error)
  }
}

/**
 * Get all active threats
 */
export async function getActiveThreats(): Promise<SecurityThreat[]> {
  try {
    const result = await db.query(
      `SELECT * FROM security_threats 
       WHERE resolved_at IS NULL 
       ORDER BY created_at DESC`,
    )

    return result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      description: row.description,
      sourceIp: row.source_ip,
      targetUserId: row.target_user_id,
      riskScore: row.risk_score,
      detectedAt: row.created_at,
      resolvedAt: row.resolved_at,
      metadata: row.metadata,
    }))
  } catch (error) {
    console.error("[v0] Error getting active threats:", error)
    return []
  }
}

/**
 * Resolve a security threat
 */
export async function resolveThreat(threatId: string, resolvedBy: number): Promise<void> {
  try {
    await db.query(
      `UPDATE security_threats 
       SET resolved_at = NOW(), resolved_by = $1 
       WHERE id = $2`,
      [resolvedBy, threatId],
    )
  } catch (error) {
    console.error("[v0] Error resolving threat:", error)
  }
}
