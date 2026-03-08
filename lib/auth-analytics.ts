import { neon } from "@neondatabase/serverless"

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("Auth analytics database is not configured")
  }

  return neon(connectionString)
}

const runQuery = (...args: Parameters<ReturnType<typeof neon>>) => getSqlClient()(...args)

const GEO_CACHE_RETENTION_DAYS = 90

function sanitizeAuthEventDetails(details: Record<string, any> = {}): Record<string, any> {
  const sanitized = { ...details }
  if (sanitized.geo && typeof sanitized.geo === "object") {
    sanitized.geo = {
      country: sanitized.geo.country ?? null,
      countryCode: sanitized.geo.countryCode ?? null,
      region: sanitized.geo.region ?? null,
      city: null,
      latitude: null,
      longitude: null,
    }
  }

  delete sanitized.ipAddress
  delete sanitized.sourceIp

  return sanitized
}

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

export function computeRealTimeMetrics(input: {
  metricRows: Array<{
    active_users?: string | number
    current_sessions?: string | number
    avg_session_seconds?: string | number | null
    peak_concurrent_users?: string | number | null
  }>
}) {
  const activeUsers = Number.parseInt(String(input.metricRows[0]?.active_users ?? 0), 10)
  const currentSessions = Number.parseInt(String(input.metricRows[0]?.current_sessions ?? 0), 10)

  const avgSessionSecondsValue = input.metricRows[0]?.avg_session_seconds
  const avgSessionDuration =
    avgSessionSecondsValue === null || avgSessionSecondsValue === undefined
      ? 0
      : Number.parseFloat((Number(avgSessionSecondsValue) / 60).toFixed(2))

  const peakConcurrentValue = input.metricRows[0]?.peak_concurrent_users
  const peakConcurrentUsers =
    peakConcurrentValue === null || peakConcurrentValue === undefined
      ? 0
      : Number.parseInt(String(peakConcurrentValue), 10)

  return {
    activeUsers,
    currentSessions,
    avgSessionDuration,
    peakConcurrentUsers,
  }
}

function emptyOverviewMetrics(): AuthAnalyticsData {
  return {
    loginAttempts: {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
    },
    authMethods: [],
    userActivity: [],
    securityEvents: [],
    geographicData: [],
    deviceData: [],
    realTimeMetrics: {
      activeUsers: 0,
      currentSessions: 0,
      avgSessionDuration: 0,
      peakConcurrentUsers: 0,
    },
  }
}

export function assembleGeographicData(rows: Array<{ country?: string; logins?: string | number }>) {
  const totalGeographicLogins = rows.reduce((sum, row) => sum + Number.parseInt(String(row.logins ?? 0), 10), 0)
  return rows.map((row) => {
    const logins = Number.parseInt(String(row.logins ?? 0), 10)
    return {
      country: row.country || "Unknown",
      logins,
      percentage: totalGeographicLogins > 0 ? (logins / totalGeographicLogins) * 100 : 0,
    }
  })
}


async function recordIngestionTelemetry(source: string, telemetryType: string, recordsIngested: number, metadata: Record<string, unknown>) {
  try {
    await runQuery(
      `
      INSERT INTO auth_analytics_ingestion_telemetry (metric_date, source, telemetry_type, records_ingested, metadata, created_at)
      VALUES (CURRENT_DATE, $1, $2, $3, $4::jsonb, NOW())
      ON CONFLICT (metric_date, source, telemetry_type) DO UPDATE
      SET
        records_ingested = EXCLUDED.records_ingested,
        metadata = EXCLUDED.metadata,
        created_at = NOW()
    `,
      [source, telemetryType, recordsIngested, JSON.stringify(metadata)],
    )
  } catch {
    // Non-blocking ingestion telemetry.
  }
}

async function safeRunAuthQuery(query: string, params: unknown[] = []): Promise<any[]> {
  try {
    return await runQuery(query, params)
  } catch {
    return []
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
  private static async upsertIpGeoCacheForRange(start: string, end: string): Promise<void> {
    const upsertResult = await runQuery(
      `
      WITH upserted_rows AS (
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
        ae.ip_address,
        COALESCE(NULLIF(ae.details->'geo'->>'countryCode', ''), 'ZZ') as country_code,
        COALESCE(NULLIF(ae.details->'geo'->>'country', ''), 'Unknown') as country_name,
        NULLIF(ae.details->'geo'->>'region', '') as region_name,
        CASE WHEN ae.details ? 'geo' THEN 'event_payload' ELSE 'pending_lookup' END as source,
        NOW(),
        NOW() + ($3::text || ' days')::interval,
        NOW(),
        NOW()
      FROM auth_events ae
      LEFT JOIN auth_ip_geo_cache geo ON geo.ip_address = ae.ip_address
      WHERE ae.created_at BETWEEN $1 AND $2
        AND ae.ip_address IS NOT NULL
        AND (
          geo.ip_address IS NULL
          OR geo.expires_at <= NOW()
          OR (ae.details ? 'geo' AND geo.source <> 'event_payload')
        )
      GROUP BY ae.ip_address, country_code, country_name, region_name, source
      ON CONFLICT (ip_address) DO UPDATE
      SET
        country_code = COALESCE(EXCLUDED.country_code, auth_ip_geo_cache.country_code),
        country_name = COALESCE(EXCLUDED.country_name, auth_ip_geo_cache.country_name),
        region_name = COALESCE(EXCLUDED.region_name, auth_ip_geo_cache.region_name),
        source = CASE
          WHEN EXCLUDED.source = 'event_payload' THEN EXCLUDED.source
          ELSE auth_ip_geo_cache.source
        END,
        last_enriched_at = NOW(),
        expires_at = NOW() + ($3::text || ' days')::interval,
        updated_at = NOW()
        RETURNING 1
      )
      SELECT COUNT(*)::bigint as upserted_count FROM upserted_rows
    `,
      [start, end, GEO_CACHE_RETENTION_DAYS],
    )

    await recordIngestionTelemetry("auth_events", "geo_ip_enrichment", Number(upsertResult[0]?.upserted_count ?? 0), {
      rangeStart: start,
      rangeEnd: end,
      retentionDays: GEO_CACHE_RETENTION_DAYS,
    })
  }

  static async getOverviewMetrics(dateRange: { start: string; end: string }): Promise<AuthAnalyticsData> {
    const { start, end } = dateRange

    try {
      await this.upsertIpGeoCacheForRange(start, end)
    } catch {
      return emptyOverviewMetrics()
    }

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
    const loginAttempts = await safeRunAuthQuery(loginAttemptsQuery, [start, end])
    const loginData = loginAttempts[0] ?? { total: 0, successful: 0, failed: 0 }
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
    const authMethodsData = await safeRunAuthQuery(authMethodsQuery, [start, end])
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
    const userActivity = await safeRunAuthQuery(activityQuery, [start, end])

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
    const securityEvents = await safeRunAuthQuery(securityQuery, [start, end])

    // Get geographic data from geo-enriched cache and materialized aggregate view
    const geographicQuery = `
      WITH geo_source AS (
        SELECT country_name, logins
        FROM mv_auth_geographic_login_daily
        WHERE date BETWEEN DATE($1) AND DATE($2)

        UNION ALL

        SELECT
          COALESCE(geo.country_name, 'Unknown') as country_name,
          COUNT(*) as logins
        FROM auth_events ae
        LEFT JOIN auth_ip_geo_cache geo
          ON geo.ip_address = ae.ip_address
          AND geo.expires_at > NOW()
        WHERE ae.event_type = 'login'
          AND ae.success = true
          AND ae.created_at BETWEEN $1 AND $2
          AND NOT EXISTS (
            SELECT 1
            FROM mv_auth_geographic_login_daily mv
            WHERE mv.date BETWEEN DATE($1) AND DATE($2)
          )
        GROUP BY COALESCE(geo.country_name, 'Unknown')
      )
      SELECT country_name as country, SUM(logins) as logins
      FROM geo_source
      GROUP BY country_name
      ORDER BY logins DESC
      LIMIT 10
    `
    const geographicRows = await safeRunAuthQuery(geographicQuery, [start, end])
    const geographicData = assembleGeographicData(geographicRows)

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
    const deviceData = await safeRunAuthQuery(deviceQuery, [start, end])
    const totalDeviceLogins = deviceData.reduce((sum: number, row: any) => sum + Number.parseInt(row.count), 0)
    const deviceDataWithPercentage = deviceData.map((row: any) => ({
      device: row.device,
      count: Number.parseInt(row.count),
      percentage: totalDeviceLogins > 0 ? (Number.parseInt(row.count) / totalDeviceLogins) * 100 : 0,
    }))

    // Get real-time metrics
    const realTimeMetricsQuery = `
      WITH metrics_source AS (
        SELECT
          SUM(active_users)::bigint as active_users,
          SUM(current_sessions)::bigint as current_sessions,
          AVG(avg_session_seconds)::numeric as avg_session_seconds,
          MAX(peak_concurrent_users)::bigint as peak_concurrent_users
        FROM mv_auth_session_concurrency_daily
        WHERE date BETWEEN DATE($1) AND DATE($2)

        UNION ALL

        SELECT
          COUNT(DISTINCT user_id)::bigint as active_users,
          COUNT(*)::bigint as current_sessions,
          AVG(EXTRACT(EPOCH FROM (COALESCE(last_activity, expires_at, NOW()) - created_at)))::numeric as avg_session_seconds,
          (
            WITH session_windows AS (
              SELECT
                created_at as started_at,
                COALESCE(last_activity, expires_at, NOW()) as ended_at
              FROM user_sessions
              WHERE created_at <= $2
                AND COALESCE(last_activity, expires_at, NOW()) >= $1
            ),
            events AS (
              SELECT started_at as event_time, 1 as delta FROM session_windows
              UNION ALL
              SELECT ended_at as event_time, -1 as delta FROM session_windows
            ),
            timeline AS (
              SELECT SUM(delta) OVER (ORDER BY event_time, delta DESC) as concurrent_sessions
              FROM events
            )
            SELECT COALESCE(MAX(concurrent_sessions), 0)::bigint
            FROM timeline
          ) as peak_concurrent_users
        FROM user_sessions
        WHERE created_at BETWEEN $1 AND $2
          AND COALESCE(last_activity, expires_at, NOW()) >= created_at
          AND NOT EXISTS (
            SELECT 1
            FROM mv_auth_session_concurrency_daily mv
            WHERE mv.date BETWEEN DATE($1) AND DATE($2)
          )
      )
      SELECT
        COALESCE(MAX(active_users), 0)::bigint as active_users,
        COALESCE(MAX(current_sessions), 0)::bigint as current_sessions,
        COALESCE(MAX(avg_session_seconds), 0)::numeric as avg_session_seconds,
        COALESCE(MAX(peak_concurrent_users), 0)::bigint as peak_concurrent_users
      FROM metrics_source
    `
    const realTimeMetricRows = await safeRunAuthQuery(realTimeMetricsQuery, [start, end])

    const realTimeMetrics = computeRealTimeMetrics({
      metricRows: realTimeMetricRows,
    })

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
      realTimeMetrics,
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
      [userId, eventType, success, ipAddress, userAgent, JSON.stringify(sanitizeAuthEventDetails(details))],
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
