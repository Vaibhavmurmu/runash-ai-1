import { neon } from "@neondatabase/serverless"

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("Auth analytics database is not configured")
  }

  return neon(connectionString)
}

const runQuery = (...args: Parameters<ReturnType<typeof neon>>) => getSqlClient()(...args)

export interface AuthAnalyticsData {
  loginAttempts: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
  authMethods: {
    method: string
    count: number
    percentage: number
  }[]
  userActivity: {
    date: string
    logins: number
    registrations: number
    passwordResets: number
  }[]
  securityEvents: {
    type: string
    count: number
    severity: "low" | "medium" | "high"
  }[]
  geographicData: {
    country: string
    logins: number
    percentage: number
  }[]
  deviceData: {
    device: string
    count: number
    percentage: number
  }[]
  realTimeMetrics: {
    activeUsers: number
    currentSessions: number
    avgSessionDuration: number
    peakConcurrentUsers: number
  }
}

export interface AuthEvent {
  id: number
  user_id: number | null
  event_type: string
  ip_address: string
  user_agent: string
  success: boolean
  details: any
  created_at: string
}

export interface SecurityAlert {
  id: number
  type: string
  severity: "low" | "medium" | "high"
  message: string
  user_id: number | null
  ip_address: string
  resolved: boolean
  created_at: string
}

export class AuthAnalytics {
  static async getOverviewMetrics(dateRange: { start: string; end: string }): Promise<AuthAnalyticsData> {
    const { start, end } = dateRange

    // Get login attempts data
    const loginAttemptsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN success = true THEN 1 END) as successful,
        COUNT(CASE WHEN success = false THEN 1 END) as failed
      FROM auth_events 
      WHERE event_type = 'login' 
      AND created_at BETWEEN $1 AND $2
    `
    const loginAttempts = await runQuery(loginAttemptsQuery, [start, end])
    const loginData = loginAttempts[0]
    const successRate = loginData.total > 0 ? (loginData.successful / loginData.total) * 100 : 0

    // Get authentication methods distribution
    const authMethodsQuery = `
      SELECT 
        COALESCE(details->>'method', 'email') as method,
        COUNT(*) as count
      FROM auth_events 
      WHERE event_type = 'login' 
      AND success = true
      AND created_at BETWEEN $1 AND $2
      GROUP BY method
      ORDER BY count DESC
    `
    const authMethodsData = await runQuery(authMethodsQuery, [start, end])
    const totalSuccessfulLogins = authMethodsData.reduce((sum: number, row: any) => sum + Number.parseInt(row.count), 0)
    const authMethods = authMethodsData.map((row: any) => ({
      method: row.method,
      count: Number.parseInt(row.count),
      percentage: totalSuccessfulLogins > 0 ? (Number.parseInt(row.count) / totalSuccessfulLogins) * 100 : 0,
    }))

    // Get daily activity data
    const activityQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN event_type = 'login' AND success = true THEN 1 END) as logins,
        COUNT(CASE WHEN event_type = 'register' THEN 1 END) as registrations,
        COUNT(CASE WHEN event_type = 'password_reset' THEN 1 END) as password_resets
      FROM auth_events 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `
    const userActivity = await runQuery(activityQuery, [start, end])

    // Get security events
    const securityQuery = `
      SELECT 
        event_type as type,
        COUNT(*) as count,
        CASE 
          WHEN event_type IN ('failed_login', 'suspicious_activity') THEN 'medium'
          WHEN event_type IN ('account_locked', 'security_breach') THEN 'high'
          ELSE 'low'
        END as severity
      FROM auth_events 
      WHERE event_type IN ('failed_login', 'suspicious_activity', 'account_locked', 'multiple_failed_attempts')
      AND created_at BETWEEN $1 AND $2
      GROUP BY event_type
    `
    const securityEvents = await runQuery(securityQuery, [start, end])

    // Get geographic data (mock for now - would need IP geolocation)
    const geographicData = [
      { country: "United States", logins: 450, percentage: 35 },
      { country: "United Kingdom", logins: 280, percentage: 22 },
      { country: "Canada", logins: 180, percentage: 14 },
      { country: "Germany", logins: 120, percentage: 9 },
      { country: "Australia", logins: 95, percentage: 7 },
      { country: "Other", logins: 165, percentage: 13 },
    ]

    // Get device data (parsed from user agent - simplified)
    const deviceQuery = `
      SELECT 
        CASE 
          WHEN user_agent ILIKE '%mobile%' OR user_agent ILIKE '%android%' OR user_agent ILIKE '%iphone%' THEN 'Mobile'
          WHEN user_agent ILIKE '%tablet%' OR user_agent ILIKE '%ipad%' THEN 'Tablet'
          ELSE 'Desktop'
        END as device,
        COUNT(*) as count
      FROM auth_events 
      WHERE event_type = 'login' 
      AND success = true
      AND created_at BETWEEN $1 AND $2
      GROUP BY device
    `
    const deviceData = await runQuery(deviceQuery, [start, end])
    const totalDeviceLogins = deviceData.reduce((sum: number, row: any) => sum + Number.parseInt(row.count), 0)
    const deviceDataWithPercentage = deviceData.map((row: any) => ({
      device: row.device,
      count: Number.parseInt(row.count),
      percentage: totalDeviceLogins > 0 ? (Number.parseInt(row.count) / totalDeviceLogins) * 100 : 0,
    }))

    // Get real-time metrics
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_sessions 
      WHERE expires_at > NOW()
    `
    const activeUsers = await runQuery(activeUsersQuery)

    const currentSessionsQuery = `
      SELECT COUNT(*) as current_sessions
      FROM user_sessions 
      WHERE expires_at > NOW()
    `
    const currentSessions = await runQuery(currentSessionsQuery)

    return {
      loginAttempts: {
        total: Number.parseInt(loginData.total),
        successful: Number.parseInt(loginData.successful),
        failed: Number.parseInt(loginData.failed),
        successRate: Number.parseFloat(successRate.toFixed(2)),
      },
      authMethods,
      userActivity: userActivity.map((row: any) => ({
        date: row.date,
        logins: Number.parseInt(row.logins),
        registrations: Number.parseInt(row.registrations),
        passwordResets: Number.parseInt(row.password_resets),
      })),
      securityEvents: securityEvents.map((row: any) => ({
        type: row.type,
        count: Number.parseInt(row.count),
        severity: row.severity,
      })),
      geographicData,
      deviceData: deviceDataWithPercentage,
      realTimeMetrics: {
        activeUsers: Number.parseInt(activeUsers[0]?.active_users || 0),
        currentSessions: Number.parseInt(currentSessions[0]?.current_sessions || 0),
        avgSessionDuration: 45, // Mock data - would calculate from session data
        peakConcurrentUsers: 156, // Mock data - would track peak concurrent users
      },
    }
  }

  static async getRecentAuthEvents(limit = 50): Promise<AuthEvent[]> {
    const query = `
      SELECT ae.*, u.email, u.name
      FROM auth_events ae
      LEFT JOIN users u ON ae.user_id = u.id
      ORDER BY ae.created_at DESC
      LIMIT $1
    `
    return await runQuery(query, [limit])
  }

  static async getSecurityAlerts(resolved = false): Promise<SecurityAlert[]> {
    const query = `
      SELECT *
      FROM security_alerts
      WHERE resolved = $1
      ORDER BY created_at DESC
      LIMIT 100
    `
    return await runQuery(query, [resolved])
  }

  static async logAuthEvent(
    userId: number | null,
    eventType: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    details: any = {},
  ): Promise<void> {
    await runQuery(
      `
      INSERT INTO auth_events (user_id, event_type, success, ip_address, user_agent, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
      [userId, eventType, success, ipAddress, userAgent, JSON.stringify(details)],
    )
  }

  static async createSecurityAlert(
    type: string,
    severity: "low" | "medium" | "high",
    message: string,
    userId: number | null = null,
    ipAddress = "",
  ): Promise<void> {
    await runQuery(
      `
      INSERT INTO security_alerts (type, severity, message, user_id, ip_address, resolved, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
    `,
      [type, severity, message, userId, ipAddress],
    )
  }

  static async getAuthTrends(days = 30): Promise<any> {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN event_type = 'login' AND success = true THEN 1 END) as successful_logins,
        COUNT(CASE WHEN event_type = 'login' AND success = false THEN 1 END) as failed_logins,
        COUNT(CASE WHEN event_type = 'register' THEN 1 END) as registrations,
        COUNT(DISTINCT user_id) as unique_users
      FROM auth_events 
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `
    return await runQuery(query)
  }
}
