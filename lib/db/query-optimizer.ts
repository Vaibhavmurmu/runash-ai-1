import { db } from "@/lib/db"

/**
 * Database query optimization utilities
 */

/**
 * Get query execution plan
 */
export async function explainQuery(query: string, params: any[] = []): Promise<any[]> {
  try {
    const result = await db.query(`EXPLAIN ${query}`, params)
    return result.rows
  } catch (error) {
    console.error("[v0] Error explaining query:", error)
    return []
  }
}

/**
 * Get index recommendations
 */
export async function getIndexRecommendations(): Promise<string[]> {
  try {
    const result = await db.query(`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY tablename, indexname
    `)

    return result.rows.map(
      (row: any) => `${row.schemaname}.${row.tablename}.${row.indexname}`,
    )
  } catch (error) {
    console.error("[v0] Error getting indexes:", error)
    return []
  }
}

/**
 * Get table statistics
 */
export async function getTableStats(tableName: string): Promise<{
  rowCount: number
  sizeBytes: number
  lastVacuum: Date | null
}> {
  try {
    const result = await db.query(
      `
      SELECT 
        n_live_tup as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        last_vacuum as last_vacuum_time
      FROM pg_stat_user_tables
      WHERE tablename = $1
    `,
      [tableName],
    )

    if (result.rows.length === 0) {
      return { rowCount: 0, sizeBytes: 0, lastVacuum: null }
    }

    const row = result.rows[0]
    return {
      rowCount: row.row_count || 0,
      sizeBytes: row.size_bytes || 0,
      lastVacuum: row.last_vacuum_time ? new Date(row.last_vacuum_time) : null,
    }
  } catch (error) {
    console.error(`[v0] Error getting table stats for ${tableName}:`, error)
    return { rowCount: 0, sizeBytes: 0, lastVacuum: null }
  }
}

/**
 * Find missing indexes
 */
export async function findMissingIndexes(): Promise<
  Array<{
    schema: string
    table: string
    column: string
    reason: string
  }>
> {
  try {
    const result = await db.query(`
      SELECT schemaname, tablename, attname
      FROM pg_stat_user_tables t
      JOIN pg_attribute a ON a.attrelid = t.relid
      WHERE 
        schemaname NOT IN ('pg_catalog', 'information_schema')
        AND seq_scan > idx_scan
        AND seq_scan > 1000
      LIMIT 20
    `)

    return result.rows.map((row: any) => ({
      schema: row.schemaname,
      table: row.tablename,
      column: row.attname,
      reason: "High sequential scans - consider adding index",
    }))
  } catch (error) {
    console.error("[v0] Error finding missing indexes:", error)
    return []
  }
}

/**
 * Analyze query performance
 */
export async function analyzeQueryPerformance(query: string, params: any[] = []): Promise<{
  executionTime: number
  rowsAffected: number
  estimatedCost: number
}> {
  try {
    const startTime = Date.now()
    const result = await db.query(query, params)
    const executionTime = Date.now() - startTime

    const explainResult = await db.query(`EXPLAIN ${query}`, params)
    const estimatedCost = extractEstimatedCost(explainResult.rows)

    return {
      executionTime,
      rowsAffected: result.rowCount || 0,
      estimatedCost,
    }
  } catch (error) {
    console.error("[v0] Error analyzing query performance:", error)
    return {
      executionTime: 0,
      rowsAffected: 0,
      estimatedCost: 0,
    }
  }
}

/**
 * Extract estimated cost from EXPLAIN output
 */
function extractEstimatedCost(rows: any[]): number {
  if (rows.length === 0) return 0

  const firstRow = rows[0]["QUERY PLAN"] || rows[0].plan || ""
  const match = firstRow.match(/cost=[\d.]+\.\.(\d+\.?\d*)/)

  return match ? parseFloat(match[1]) : 0
}

/**
 * Suggested indexes for authentication tables
 */
export const SUGGESTED_AUTH_INDEXES = [
  // Session table
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_session_user_id ON neon_auth.session(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_session_user_token ON neon_auth.session(user_id, token)",
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_session_expires_at ON neon_auth.session(expires_at)",

  // User table
  "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
  "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)",

  // Account table
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_account_user_id ON neon_auth.account(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_account_provider ON neon_auth.account(provider_id, account_id)",

  // Verification table
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_verification_identifier ON neon_auth.verification(identifier)",
  "CREATE INDEX IF NOT EXISTS idx_neon_auth_verification_expires_at ON neon_auth.verification(expires_at)",

  // Audit events
  "CREATE INDEX IF NOT EXISTS idx_audit_events_user_id_created_at ON audit_events(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_audit_events_action_created_at ON audit_events(action, created_at DESC)",

  // Session locations
  "CREATE INDEX IF NOT EXISTS idx_session_locations_user_id_timestamp ON session_locations(user_id, timestamp DESC)",

  // Suspicious logins
  "CREATE INDEX IF NOT EXISTS idx_suspicious_logins_user_id_created_at ON suspicious_logins(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_suspicious_logins_status ON suspicious_logins(status, created_at DESC)",

  // Security threats
  "CREATE INDEX IF NOT EXISTS idx_security_threats_severity ON security_threats(severity DESC, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_security_threats_resolved ON security_threats(status, resolved_at NULLS LAST)",
]

/**
 * Create all suggested indexes
 */
export async function createSuggestedIndexes(): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const indexQuery of SUGGESTED_AUTH_INDEXES) {
    try {
      await db.query(indexQuery)
      success++
      console.log(`[v0] Created index successfully`)
    } catch (error) {
      failed++
      console.warn(`[v0] Failed to create index:`, error)
    }
  }

  return { success, failed }
}
