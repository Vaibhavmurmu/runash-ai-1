import { neon } from "@neondatabase/serverless"
import { createHash } from "node:crypto"
import { redactAuthLogValue } from "@/lib/auth-log-redaction"

const sql = neon(process.env.DATABASE_URL!)

export interface AuthLogEntry {
  id: number
  user_id: number | null
  session_id: string | null
  event_type: string
  event_category: string
  success: boolean
  ip_address: string
  user_agent: string
  location?: {
    country?: string
    city?: string
    region?: string
  }
  device_info?: {
    device_type: string
    browser: string
    os: string
  }
  details: any
  risk_score: number
  created_at: string
  expires_at?: string
}

export interface LogFilters {
  user_id?: number
  event_type?: string
  event_category?: string
  success?: boolean
  ip_address?: string
  date_from?: string
  date_to?: string
  risk_score_min?: number
  risk_score_max?: number
  search?: string
}

export interface LogAnalytics {
  totalLogs: number
  successRate: number
  topEventTypes: { event_type: string; count: number }[]
  topIpAddresses: { ip_address: string; count: number; risk_score: number }[]
  riskDistribution: { risk_level: string; count: number }[]
  hourlyActivity: { hour: number; count: number }[]
}

export class AuthLogger {
  static async log(
    userId: number | null,
    sessionId: string | null,
    eventType: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    details: any = {},
    riskScore = 0,
  ): Promise<void> {
    const eventCategory = this.categorizeEvent(eventType)
    const deviceInfo = this.parseUserAgent(userAgent)
    const location = await this.getLocationFromIP(ipAddress)
    const redactedDetails = redactAuthLogValue(details)
    const anonymizedSessionId = sessionId ? createHash("sha256").update(sessionId).digest("hex") : null

    // Calculate expiration date (keep logs for 1 year by default)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await sql(
      `
      INSERT INTO auth_logs (
        user_id, session_id, event_type, event_category, success, 
        ip_address, user_agent, location, device_info, details, 
        risk_score, created_at, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12)
    `,
      [
        userId,
        anonymizedSessionId,
        eventType,
        eventCategory,
        success,
        ipAddress,
        userAgent,
        JSON.stringify(location),
        JSON.stringify(deviceInfo),
        JSON.stringify(redactedDetails),
        riskScore,
        expiresAt.toISOString(),
      ],
    )

    // Check for suspicious patterns
    await this.detectSuspiciousActivity(userId, ipAddress, eventType, success)
  }

  static async getLogs(
    filters: LogFilters = {},
    page = 1,
    limit = 50,
  ): Promise<{ logs: AuthLogEntry[]; total: number; page: number; totalPages: number }> {
    const offset = (page - 1) * limit
    const whereConditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // Build WHERE conditions
    if (filters.user_id) {
      whereConditions.push(`user_id = $${paramIndex}`)
      params.push(filters.user_id)
      paramIndex++
    }

    if (filters.event_type) {
      whereConditions.push(`event_type = $${paramIndex}`)
      params.push(filters.event_type)
      paramIndex++
    }

    if (filters.event_category) {
      whereConditions.push(`event_category = $${paramIndex}`)
      params.push(filters.event_category)
      paramIndex++
    }

    if (filters.success !== undefined) {
      whereConditions.push(`success = $${paramIndex}`)
      params.push(filters.success)
      paramIndex++
    }

    if (filters.ip_address) {
      whereConditions.push(`ip_address = $${paramIndex}`)
      params.push(filters.ip_address)
      paramIndex++
    }

    if (filters.date_from) {
      whereConditions.push(`created_at >= $${paramIndex}`)
      params.push(filters.date_from)
      paramIndex++
    }

    if (filters.date_to) {
      whereConditions.push(`created_at <= $${paramIndex}`)
      params.push(filters.date_to)
      paramIndex++
    }

    if (filters.risk_score_min !== undefined) {
      whereConditions.push(`risk_score >= $${paramIndex}`)
      params.push(filters.risk_score_min)
      paramIndex++
    }

    if (filters.risk_score_max !== undefined) {
      whereConditions.push(`risk_score <= $${paramIndex}`)
      params.push(filters.risk_score_max)
      paramIndex++
    }

    if (filters.search) {
      whereConditions.push(`(details::text ILIKE $${paramIndex} OR user_agent ILIKE $${paramIndex})`)
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM auth_logs ${whereClause}`
    const countResult = await sql(countQuery, params)
    const total = Number.parseInt(countResult[0].total)

    // Get logs with pagination
    const logsQuery = `
      SELECT 
        al.*,
        u.email,
        u.name
      FROM auth_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    const logs = await sql(logsQuery, [...params, limit, offset])

    return {
      logs: logs.map((log: any) => ({
        ...log,
        location: log.location ? JSON.parse(log.location) : null,
        device_info: log.device_info ? JSON.parse(log.device_info) : null,
        details: log.details ? JSON.parse(log.details) : {},
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  static async getLogAnalytics(dateRange: { start: string; end: string }): Promise<LogAnalytics> {
    const { start, end } = dateRange

    // Total logs and success rate
    const overviewQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_logs
      FROM auth_logs 
      WHERE created_at BETWEEN $1 AND $2
    `
    const overview = await sql(overviewQuery, [start, end])
    const totalLogs = Number.parseInt(overview[0].total_logs)
    const successfulLogs = Number.parseInt(overview[0].successful_logs)
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0

    // Top event types
    const eventTypesQuery = `
      SELECT event_type, COUNT(*) as count
      FROM auth_logs 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `
    const topEventTypes = await sql(eventTypesQuery, [start, end])

    // Top IP addresses with risk scores
    const ipAddressesQuery = `
      SELECT 
        ip_address, 
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score
      FROM auth_logs 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT 10
    `
    const topIpAddresses = await sql(ipAddressesQuery, [start, end])

    // Risk distribution
    const riskQuery = `
      SELECT 
        CASE 
          WHEN risk_score = 0 THEN 'Low'
          WHEN risk_score <= 3 THEN 'Medium'
          WHEN risk_score <= 7 THEN 'High'
          ELSE 'Critical'
        END as risk_level,
        COUNT(*) as count
      FROM auth_logs 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY risk_level
      ORDER BY count DESC
    `
    const riskDistribution = await sql(riskQuery, [start, end])

    // Hourly activity
    const hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM auth_logs 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY hour
      ORDER BY hour
    `
    const hourlyActivity = await sql(hourlyQuery, [start, end])

    return {
      totalLogs,
      successRate: Number.parseFloat(successRate.toFixed(2)),
      topEventTypes: topEventTypes.map((row: any) => ({
        event_type: row.event_type,
        count: Number.parseInt(row.count),
      })),
      topIpAddresses: topIpAddresses.map((row: any) => ({
        ip_address: row.ip_address,
        count: Number.parseInt(row.count),
        risk_score: Number.parseFloat(row.avg_risk_score || 0),
      })),
      riskDistribution: riskDistribution.map((row: any) => ({
        risk_level: row.risk_level,
        count: Number.parseInt(row.count),
      })),
      hourlyActivity: hourlyActivity.map((row: any) => ({
        hour: Number.parseInt(row.hour),
        count: Number.parseInt(row.count),
      })),
    }
  }

  static async exportLogs(filters: LogFilters = {}, format: "csv" | "json" = "csv"): Promise<string> {
    const { logs } = await this.getLogs(filters, 1, 10000) // Export up to 10k logs

    if (format === "json") {
      return JSON.stringify(logs, null, 2)
    }

    // CSV format
    const headers = [
      "ID",
      "User ID",
      "Email",
      "Event Type",
      "Success",
      "IP Address",
      "User Agent",
      "Risk Score",
      "Created At",
    ]

    const csvRows = [
      headers.join(","),
      ...logs.map((log: any) =>
        [
          log.id,
          log.user_id || "",
          log.email || "",
          log.event_type,
          log.success,
          log.ip_address,
          `"${log.user_agent.replace(/"/g, '""')}"`,
          log.risk_score,
          log.created_at,
        ].join(","),
      ),
    ]

    return csvRows.join("\n")
  }

  static async cleanupExpiredLogs(): Promise<number> {
    const result = await sql(`DELETE FROM auth_logs WHERE expires_at < NOW()`)
    return result.length
  }

  private static categorizeEvent(eventType: string): string {
    const categories: { [key: string]: string } = {
      login: "authentication",
      logout: "authentication",
      register: "registration",
      password_reset: "password_management",
      password_change: "password_management",
      email_verification: "verification",
      two_factor_setup: "security",
      two_factor_verify: "security",
      account_locked: "security",
      suspicious_activity: "security",
      session_expired: "session_management",
      session_created: "session_management",
    }

    return categories[eventType] || "other"
  }

  private static parseUserAgent(userAgent: string): any {
    // Simplified user agent parsing - in production, use a proper library
    const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? "mobile" : "desktop"
    const browser = userAgent.includes("Chrome")
      ? "Chrome"
      : userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Safari")
          ? "Safari"
          : "Other"
    const os = userAgent.includes("Windows")
      ? "Windows"
      : userAgent.includes("Mac")
        ? "macOS"
        : userAgent.includes("Linux")
          ? "Linux"
          : "Other"

    return { device_type: deviceType, browser, os }
  }

  private static async getLocationFromIP(ipAddress: string): Promise<any> {
    // Mock location data - in production, use a geolocation service
    const mockLocations = [
      { country: "United States", city: "New York", region: "NY" },
      { country: "United Kingdom", city: "London", region: "England" },
      { country: "Canada", city: "Toronto", region: "ON" },
      { country: "Germany", city: "Berlin", region: "Berlin" },
      { country: "Australia", city: "Sydney", region: "NSW" },
    ]

    return mockLocations[Math.floor(Math.random() * mockLocations.length)]
  }

  private static async detectSuspiciousActivity(
    userId: number | null,
    ipAddress: string,
    eventType: string,
    success: boolean,
  ): Promise<void> {
    if (!success && eventType === "login") {
      // Check for multiple failed login attempts
      const recentFailures = await sql(
        `
        SELECT COUNT(*) as count
        FROM auth_logs 
        WHERE ip_address = $1 
        AND event_type = 'login' 
        AND success = false 
        AND created_at > NOW() - INTERVAL '15 minutes'
      `,
        [ipAddress],
      )

      const failureCount = Number.parseInt(recentFailures[0].count)
      if (failureCount >= 5) {
        // Create security alert
        await sql(
          `
          INSERT INTO security_alerts (type, severity, message, user_id, ip_address, resolved, created_at)
          VALUES ('multiple_failed_logins', 'medium', $1, $2, $3, false, NOW())
        `,
          [`Multiple failed login attempts from IP ${ipAddress}`, userId, ipAddress],
        )
      }
    }

    // Check for login from new location
    if (success && eventType === "login" && userId) {
      const recentLogins = await sql(
        `
        SELECT DISTINCT location
        FROM auth_logs 
        WHERE user_id = $1 
        AND event_type = 'login' 
        AND success = true 
        AND created_at > NOW() - INTERVAL '30 days'
        AND created_at < NOW() - INTERVAL '1 hour'
        LIMIT 10
      `,
        [userId],
      )

      // This is a simplified check - in production, you'd compare actual locations
      if (recentLogins.length > 0) {
        const currentLocation = await this.getLocationFromIP(ipAddress)
        const hasSeenLocation = recentLogins.some((log: any) => {
          const location = JSON.parse(log.location || "{}")
          return location.country === currentLocation.country
        })

        if (!hasSeenLocation) {
          await sql(
            `
            INSERT INTO security_alerts (type, severity, message, user_id, ip_address, resolved, created_at)
            VALUES ('new_location_login', 'low', $1, $2, $3, false, NOW())
          `,
            [`Login from new location: ${currentLocation.city}, ${currentLocation.country}`, userId, ipAddress],
          )
        }
      }
    }
  }
}
