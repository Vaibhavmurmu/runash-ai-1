import { neon } from "@neondatabase/serverless"
import { AuthLogger } from "./auth-logger"

const sql = neon(process.env.DATABASE_URL!)

const GEO_CACHE_RETENTION_DAYS = 90

async function upsertThreatIpGeoCache(start: string, end: string): Promise<void> {
  await sql(
    `
      INSERT INTO auth_ip_geo_cache (
        ip_address,
        country_code,
        country_name,
        region_name,
        source,
        last_enriched_at,
        expires_at,
        created_at,
        updated_at
      )
      SELECT
        st.source_ip,
        COALESCE(NULLIF(st.metadata->'geo'->>'countryCode', ''), 'ZZ') as country_code,
        COALESCE(NULLIF(st.metadata->'geo'->>'country', ''), 'Unknown') as country_name,
        NULLIF(st.metadata->'geo'->>'region', '') as region_name,
        CASE WHEN st.metadata ? 'geo' THEN 'threat_payload' ELSE 'pending_lookup' END as source,
        NOW(),
        NOW() + ($3::text || ' days')::interval,
        NOW(),
        NOW()
      FROM security_threats st
      LEFT JOIN auth_ip_geo_cache geo ON geo.ip_address = st.source_ip
      WHERE st.first_detected BETWEEN $1 AND $2
        AND st.source_ip IS NOT NULL
        AND (
          geo.ip_address IS NULL
          OR geo.expires_at <= NOW()
          OR (st.metadata ? 'geo' AND geo.source <> 'threat_payload')
        )
      GROUP BY st.source_ip, country_code, country_name, region_name, source
      ON CONFLICT (ip_address) DO UPDATE
      SET
        country_code = COALESCE(EXCLUDED.country_code, auth_ip_geo_cache.country_code),
        country_name = COALESCE(EXCLUDED.country_name, auth_ip_geo_cache.country_name),
        region_name = COALESCE(EXCLUDED.region_name, auth_ip_geo_cache.region_name),
        source = CASE
          WHEN EXCLUDED.source = 'threat_payload' THEN EXCLUDED.source
          ELSE auth_ip_geo_cache.source
        END,
        last_enriched_at = NOW(),
        expires_at = NOW() + ($3::text || ' days')::interval,
        updated_at = NOW()
    `,
    [start, end, GEO_CACHE_RETENTION_DAYS],
  )
}


export interface SecurityThreat {
  id: number
  threat_type: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  source_ip: string
  target_user_id: number | null
  indicators: string[]
  status: "active" | "investigating" | "resolved" | "false_positive"
  first_detected: string
  last_seen: string
  occurrences: number
  risk_score: number
  auto_resolved: boolean
  resolved_by: number | null
  resolved_at: string | null
  metadata: any
}

export interface SecurityMetrics {
  activeThreats: number
  resolvedThreats: number
  criticalAlerts: number
  blockedIPs: number
  suspiciousActivities: number
  threatsByType: { type: string; count: number; severity: string }[]
  threatTrends: { date: string; threats: number; resolved: number }[]
  topThreats: { threat_type: string; count: number; avg_risk: number }[]
  geographicThreats: { country: string; threats: number; risk_score: number }[]
}

export interface SecurityRule {
  id: number
  name: string
  description: string
  rule_type: string
  conditions: any
  actions: any
  severity: "low" | "medium" | "high" | "critical"
  enabled: boolean
  created_at: string
  updated_at: string
}

export class SecurityMonitor {
  static async detectThreats(): Promise<void> {
    // Run various threat detection algorithms
    await Promise.all([
      this.detectBruteForceAttacks(),
      this.detectSuspiciousIPs(),
      this.detectAnomalousActivity(),
      this.detectCredentialStuffing(),
      this.detectAccountTakeover(),
    ])
  }

  static async getActiveThreats(limit = 50): Promise<SecurityThreat[]> {
    const query = `
      SELECT st.*, u.email as target_email, u.name as target_name
      FROM security_threats st
      LEFT JOIN users u ON st.target_user_id = u.id
      WHERE st.status = 'active'
      ORDER BY st.risk_score DESC, st.first_detected DESC
      LIMIT $1
    `
    return await sql(query, [limit])
  }

  static async getSecurityMetrics(dateRange: { start: string; end: string }): Promise<SecurityMetrics> {
    const { start, end } = dateRange

    await upsertThreatIpGeoCache(start, end)

    // Active and resolved threats
    const threatCounts = await sql(
      `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_threats,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_threats,
        COUNT(CASE WHEN severity = 'critical' AND status = 'active' THEN 1 END) as critical_alerts
      FROM security_threats
      WHERE first_detected BETWEEN $1 AND $2
    `,
      [start, end],
    )

    // Blocked IPs count
    const blockedIPs = await sql(
      `
      SELECT COUNT(DISTINCT ip_address) as blocked_ips
      FROM ip_blacklist
      WHERE created_at BETWEEN $1 AND $2
    `,
      [start, end],
    )

    // Suspicious activities
    const suspiciousActivities = await sql(
      `
      SELECT COUNT(*) as suspicious_activities
      FROM auth_logs
      WHERE risk_score > 5 AND created_at BETWEEN $1 AND $2
    `,
      [start, end],
    )

    // Threats by type
    const threatsByType = await sql(
      `
      SELECT threat_type as type, COUNT(*) as count, severity
      FROM security_threats
      WHERE first_detected BETWEEN $1 AND $2
      GROUP BY threat_type, severity
      ORDER BY count DESC
    `,
      [start, end],
    )

    // Threat trends (daily)
    const threatTrends = await sql(
      `
      SELECT 
        DATE(first_detected) as date,
        COUNT(*) as threats,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM security_threats
      WHERE first_detected BETWEEN $1 AND $2
      GROUP BY DATE(first_detected)
      ORDER BY date
    `,
      [start, end],
    )

    // Top threats
    const topThreats = await sql(
      `
      SELECT 
        threat_type,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk
      FROM security_threats
      WHERE first_detected BETWEEN $1 AND $2
      GROUP BY threat_type
      ORDER BY count DESC
      LIMIT 10
    `,
      [start, end],
    )

    const geographicThreatsQuery = `
      WITH geo_source AS (
        SELECT country_name, threats, avg_risk_score
        FROM mv_security_geographic_threat_daily
        WHERE date BETWEEN DATE($1) AND DATE($2)

        UNION ALL

        SELECT
          COALESCE(geo.country_name, 'Unknown') as country_name,
          COUNT(*) as threats,
          AVG(st.risk_score)::numeric as avg_risk_score
        FROM security_threats st
        LEFT JOIN auth_ip_geo_cache geo
          ON geo.ip_address = st.source_ip
          AND geo.expires_at > NOW()
        WHERE st.first_detected BETWEEN $1 AND $2
          AND NOT EXISTS (
            SELECT 1
            FROM mv_security_geographic_threat_daily mv
            WHERE mv.date BETWEEN DATE($1) AND DATE($2)
          )
        GROUP BY COALESCE(geo.country_name, 'Unknown')
      )
      SELECT
        country_name as country,
        SUM(threats) as threats,
        AVG(avg_risk_score)::numeric as risk_score
      FROM geo_source
      GROUP BY country_name
      ORDER BY threats DESC
      LIMIT 10
    `
    const geographicThreatRows = await sql(geographicThreatsQuery, [start, end])
    const geographicThreats = geographicThreatRows.map((row: any) => ({
      country: row.country,
      threats: Number.parseInt(row.threats),
      risk_score: Number.parseFloat(row.risk_score || 0),
    }))

    return {
      activeThreats: Number.parseInt(threatCounts[0]?.active_threats || 0),
      resolvedThreats: Number.parseInt(threatCounts[0]?.resolved_threats || 0),
      criticalAlerts: Number.parseInt(threatCounts[0]?.critical_alerts || 0),
      blockedIPs: Number.parseInt(blockedIPs[0]?.blocked_ips || 0),
      suspiciousActivities: Number.parseInt(suspiciousActivities[0]?.suspicious_activities || 0),
      threatsByType: threatsByType.map((row: any) => ({
        type: row.type,
        count: Number.parseInt(row.count),
        severity: row.severity,
      })),
      threatTrends: threatTrends.map((row: any) => ({
        date: row.date,
        threats: Number.parseInt(row.threats),
        resolved: Number.parseInt(row.resolved),
      })),
      topThreats: topThreats.map((row: any) => ({
        threat_type: row.threat_type,
        count: Number.parseInt(row.count),
        avg_risk: Number.parseFloat(row.avg_risk || 0),
      })),
      geographicThreats,
    }
  }

  static async createThreat(
    threatType: string,
    severity: "low" | "medium" | "high" | "critical",
    title: string,
    description: string,
    sourceIP: string,
    targetUserId: number | null = null,
    indicators: string[] = [],
    riskScore = 5,
    metadata: any = {},
  ): Promise<number> {
    const result = await sql(
      `
      INSERT INTO security_threats (
        threat_type, severity, title, description, source_ip, target_user_id,
        indicators, status, first_detected, last_seen, occurrences, risk_score,
        auto_resolved, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW(), 1, $8, false, $9, NOW(), NOW())
      RETURNING id
    `,
      [
        threatType,
        severity,
        title,
        description,
        sourceIP,
        targetUserId,
        JSON.stringify(indicators),
        riskScore,
        JSON.stringify(metadata),
      ],
    )

    const threatId = result[0].id

    // Auto-block IP if threat is critical
    if (severity === "critical") {
      await this.blockIP(sourceIP, `Auto-blocked due to critical threat: ${title}`)
    }

    // Send alert notifications
    await this.sendSecurityAlert(threatId, severity, title, description)

    return threatId
  }

  static async resolveThreat(threatId: number, resolvedBy: number, resolution: string): Promise<void> {
    await sql(
      `
      UPDATE security_threats 
      SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), 
          metadata = metadata || jsonb_build_object('resolution', $2)
      WHERE id = $3
    `,
      [resolvedBy, resolution, threatId],
    )
  }

  static async blockIP(ipAddress: string, reason: string, duration?: number): Promise<void> {
    const expiresAt = duration ? new Date(Date.now() + duration * 1000) : null

    await sql(
      `
      INSERT INTO ip_blacklist (ip_address, reason, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (ip_address) DO UPDATE SET
        reason = $2, expires_at = $3, updated_at = NOW()
    `,
      [ipAddress, reason, expiresAt?.toISOString()],
    )
  }

  static async unblockIP(ipAddress: string): Promise<void> {
    await sql(`DELETE FROM ip_blacklist WHERE ip_address = $1`, [ipAddress])
  }

  static async getBlockedIPs(): Promise<any[]> {
    return await sql(`
      SELECT * FROM ip_blacklist 
      WHERE expires_at IS NULL OR expires_at > NOW()
      ORDER BY created_at DESC
    `)
  }

  static async getSecurityRules(): Promise<SecurityRule[]> {
    return await sql(`
      SELECT * FROM security_rules 
      ORDER BY severity DESC, created_at DESC
    `)
  }

  static async createSecurityRule(
    name: string,
    description: string,
    ruleType: string,
    conditions: any,
    actions: any,
    severity: "low" | "medium" | "high" | "critical",
  ): Promise<number> {
    const result = await sql(
      `
      INSERT INTO security_rules (name, description, rule_type, conditions, actions, severity, enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING id
    `,
      [name, description, ruleType, JSON.stringify(conditions), JSON.stringify(actions), severity],
    )

    return result[0].id
  }

  private static async detectBruteForceAttacks(): Promise<void> {
    // Detect multiple failed login attempts from same IP
    const bruteForceIPs = await sql(`
      SELECT 
        ip_address,
        COUNT(*) as failed_attempts,
        MAX(created_at) as last_attempt
      FROM auth_logs
      WHERE event_type = 'login' 
      AND success = false 
      AND created_at > NOW() - INTERVAL '1 hour'
      GROUP BY ip_address
      HAVING COUNT(*) >= 10
    `)

    for (const ip of bruteForceIPs) {
      const existingThreat = await sql(
        `
        SELECT id FROM security_threats 
        WHERE threat_type = 'brute_force' 
        AND source_ip = $1 
        AND status = 'active'
      `,
        [ip.ip_address],
      )

      if (existingThreat.length === 0) {
        await this.createThreat(
          "brute_force",
          "high",
          "Brute Force Attack Detected",
          `${ip.failed_attempts} failed login attempts from IP ${ip.ip_address}`,
          ip.ip_address,
          null,
          ["multiple_failed_logins", "suspicious_ip"],
          8,
          { failed_attempts: ip.failed_attempts, last_attempt: ip.last_attempt },
        )
      }
    }
  }

  private static async detectSuspiciousIPs(): Promise<void> {
    // Detect IPs with high risk scores
    const suspiciousIPs = await sql(`
      SELECT 
        ip_address,
        AVG(risk_score) as avg_risk,
        COUNT(*) as event_count,
        MAX(created_at) as last_seen
      FROM auth_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      AND risk_score > 5
      GROUP BY ip_address
      HAVING AVG(risk_score) > 7
    `)

    for (const ip of suspiciousIPs) {
      const existingThreat = await sql(
        `
        SELECT id FROM security_threats 
        WHERE threat_type = 'suspicious_ip' 
        AND source_ip = $1 
        AND status = 'active'
      `,
        [ip.ip_address],
      )

      if (existingThreat.length === 0) {
        await this.createThreat(
          "suspicious_ip",
          "medium",
          "Suspicious IP Activity",
          `High-risk activity detected from IP ${ip.ip_address}`,
          ip.ip_address,
          null,
          ["high_risk_score", "suspicious_behavior"],
          Number.parseInt(ip.avg_risk),
          { avg_risk: ip.avg_risk, event_count: ip.event_count },
        )
      }
    }
  }

  private static async detectAnomalousActivity(): Promise<void> {
    // Detect users with unusual login patterns
    const anomalousUsers = await sql(`
      SELECT 
        user_id,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(*) as login_count,
        MAX(created_at) as last_login
      FROM auth_logs
      WHERE event_type = 'login' 
      AND success = true 
      AND created_at > NOW() - INTERVAL '24 hours'
      AND user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(DISTINCT ip_address) > 5
    `)

    for (const user of anomalousUsers) {
      const existingThreat = await sql(
        `
        SELECT id FROM security_threats 
        WHERE threat_type = 'anomalous_activity' 
        AND target_user_id = $1 
        AND status = 'active'
      `,
        [user.user_id],
      )

      if (existingThreat.length === 0) {
        await this.createThreat(
          "anomalous_activity",
          "medium",
          "Anomalous User Activity",
          `User ${user.user_id} logged in from ${user.unique_ips} different IPs`,
          "multiple",
          user.user_id,
          ["multiple_ips", "unusual_pattern"],
          6,
          { unique_ips: user.unique_ips, login_count: user.login_count },
        )
      }
    }
  }

  private static async detectCredentialStuffing(): Promise<void> {
    // Detect rapid login attempts across multiple accounts from same IP
    const credentialStuffingIPs = await sql(`
      SELECT 
        ip_address,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_attempts
      FROM auth_logs
      WHERE event_type = 'login' 
      AND created_at > NOW() - INTERVAL '1 hour'
      GROUP BY ip_address
      HAVING COUNT(DISTINCT user_id) > 20 
      AND COUNT(CASE WHEN success = false THEN 1 END) > 15
    `)

    for (const ip of credentialStuffingIPs) {
      const existingThreat = await sql(
        `
        SELECT id FROM security_threats 
        WHERE threat_type = 'credential_stuffing' 
        AND source_ip = $1 
        AND status = 'active'
      `,
        [ip.ip_address],
      )

      if (existingThreat.length === 0) {
        await this.createThreat(
          "credential_stuffing",
          "critical",
          "Credential Stuffing Attack",
          `Attempted login to ${ip.unique_users} accounts from IP ${ip.ip_address}`,
          ip.ip_address,
          null,
          ["multiple_accounts", "rapid_attempts", "credential_stuffing"],
          9,
          { unique_users: ip.unique_users, total_attempts: ip.total_attempts },
        )
      }
    }
  }

  private static async detectAccountTakeover(): Promise<void> {
    // Detect successful logins after multiple failures
    const takeoverAttempts = await sql(`
      WITH failed_then_success AS (
        SELECT 
          user_id,
          ip_address,
          LAG(success) OVER (PARTITION BY user_id ORDER BY created_at) as prev_success,
          success,
          created_at
        FROM auth_logs
        WHERE event_type = 'login' 
        AND created_at > NOW() - INTERVAL '2 hours'
        AND user_id IS NOT NULL
      )
      SELECT 
        user_id,
        ip_address,
        COUNT(*) as suspicious_logins
      FROM failed_then_success
      WHERE prev_success = false AND success = true
      GROUP BY user_id, ip_address
      HAVING COUNT(*) >= 3
    `)

    for (const attempt of takeoverAttempts) {
      const existingThreat = await sql(
        `
        SELECT id FROM security_threats 
        WHERE threat_type = 'account_takeover' 
        AND target_user_id = $1 
        AND source_ip = $2
        AND status = 'active'
      `,
        [attempt.user_id, attempt.ip_address],
      )

      if (existingThreat.length === 0) {
        await this.createThreat(
          "account_takeover",
          "critical",
          "Potential Account Takeover",
          `Suspicious login pattern for user ${attempt.user_id} from IP ${attempt.ip_address}`,
          attempt.ip_address,
          attempt.user_id,
          ["failed_then_success", "account_compromise"],
          9,
          { suspicious_logins: attempt.suspicious_logins },
        )
      }
    }
  }

  private static async sendSecurityAlert(
    threatId: number,
    severity: string,
    title: string,
    description: string,
  ): Promise<void> {
    // In a real implementation, this would send notifications via email, Slack, etc.
    console.log(`Security Alert [${severity.toUpperCase()}]: ${title}`)
    console.log(`Description: ${description}`)
    console.log(`Threat ID: ${threatId}`)

    // Log the alert
    await AuthLogger.log(
      null,
      null,
      "security_alert",
      true,
      "system",
      "SecurityMonitor",
      { threat_id: threatId, severity, title, description },
      severity === "critical" ? 10 : severity === "high" ? 8 : severity === "medium" ? 5 : 2,
    )
  }
}
