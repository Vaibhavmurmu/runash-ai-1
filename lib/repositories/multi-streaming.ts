import { queryMany, queryOne, sql } from "@/lib/db"
import type { MultiStreamSession, PlatformAnalytics } from "@/lib/multi-platform-service"

export type PlatformStreamState = "pending" | "live" | "stopped" | "error"

interface MultiStreamSessionRecord {
  id: string
  user_id: string
  title: string
  description: string | null
  platforms: string[]
  status: MultiStreamSession["status"]
  start_time: string | null
  end_time: string | null
  total_viewers: number
  peak_viewers: number
  duration: number
  settings: MultiStreamSession["settings"]
}

let multiStreamingTablesReady = false

export async function ensureMultiStreamingTables() {
  if (multiStreamingTablesReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS multi_stream_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'ended', 'error')),
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      total_viewers INTEGER NOT NULL DEFAULT 0,
      peak_viewers INTEGER NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_multi_stream_sessions_user_status
      ON multi_stream_sessions (user_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS multi_stream_platform_states (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES multi_stream_sessions(id) ON DELETE CASCADE,
      platform_id TEXT NOT NULL,
      platform_name TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('pending', 'live', 'stopped', 'error')) DEFAULT 'pending',
      is_title_supported BOOLEAN NOT NULL DEFAULT true,
      is_analytics_supported BOOLEAN NOT NULL DEFAULT true,
      last_error_code TEXT,
      last_error_message TEXT,
      last_heartbeat_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (session_id, platform_id)
    );

    CREATE INDEX IF NOT EXISTS idx_multi_stream_platform_states_session
      ON multi_stream_platform_states (session_id, state);

    CREATE TABLE IF NOT EXISTS platform_analytics_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT REFERENCES multi_stream_sessions(id) ON DELETE CASCADE,
      platform_id TEXT NOT NULL,
      viewers INTEGER NOT NULL DEFAULT 0,
      chat_messages INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0,
      followers_gained INTEGER NOT NULL DEFAULT 0,
      watch_time INTEGER NOT NULL DEFAULT 0,
      peak_viewers INTEGER NOT NULL DEFAULT 0,
      engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      stream_health TEXT NOT NULL CHECK (stream_health IN ('excellent', 'good', 'fair', 'poor')) DEFAULT 'good',
      bitrate_actual INTEGER NOT NULL DEFAULT 0,
      fps_actual INTEGER NOT NULL DEFAULT 0,
      dropped_frames INTEGER NOT NULL DEFAULT 0,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_platform_analytics_snapshots_platform_range
      ON platform_analytics_snapshots (platform_id, timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_platform_analytics_snapshots_session
      ON platform_analytics_snapshots (session_id, platform_id, timestamp DESC);
  `)

  multiStreamingTablesReady = true
}

export async function createMultiStreamSession(input: {
  id: string
  userId: string
  title: string
  description?: string
  platforms: string[]
  status: MultiStreamSession["status"]
  settings: MultiStreamSession["settings"]
}): Promise<MultiStreamSession> {
  await ensureMultiStreamingTables()

  const row = await queryOne<MultiStreamSessionRecord>(
    `
      INSERT INTO multi_stream_sessions (
        id,
        user_id,
        title,
        description,
        platforms,
        status,
        start_time,
        settings
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW(), $7::jsonb)
      RETURNING
        id,
        user_id,
        title,
        description,
        platforms,
        status,
        start_time,
        end_time,
        total_viewers,
        peak_viewers,
        duration,
        settings
    `,
    [
      input.id,
      input.userId,
      input.title,
      input.description ?? null,
      JSON.stringify(input.platforms),
      input.status,
      JSON.stringify(input.settings),
    ],
  )

  if (!row) throw new Error("Failed to create multi-stream session")

  return mapSessionRecord(row)
}

export async function markMultiStreamStopped(input: {
  sessionId: string
  userId: string
}): Promise<boolean> {
  await ensureMultiStreamingTables()

  const row = await queryOne<{ id: string }>(
    `
      UPDATE multi_stream_sessions
      SET status = 'ended', end_time = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [input.sessionId, input.userId],
  )

  return Boolean(row?.id)
}

export async function getMultiStreamSession(sessionId: string, userId: string): Promise<MultiStreamSession | null> {
  await ensureMultiStreamingTables()

  const row = await queryOne<MultiStreamSessionRecord>(
    `
      SELECT
        id,
        user_id,
        title,
        description,
        platforms,
        status,
        start_time,
        end_time,
        total_viewers,
        peak_viewers,
        duration,
        settings
      FROM multi_stream_sessions
      WHERE id = $1 AND user_id = $2
    `,
    [sessionId, userId],
  )

  return row ? mapSessionRecord(row) : null
}

export async function upsertSessionPlatformState(input: {
  id: string
  sessionId: string
  platformId: string
  platformName: string
  state?: PlatformStreamState
}) {
  await ensureMultiStreamingTables()

  await queryOne(
    `
      INSERT INTO multi_stream_platform_states (
        id,
        session_id,
        platform_id,
        platform_name,
        state
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (session_id, platform_id)
      DO UPDATE SET
        state = EXCLUDED.state,
        platform_name = EXCLUDED.platform_name,
        updated_at = NOW()
      RETURNING id
    `,
    [input.id, input.sessionId, input.platformId, input.platformName, input.state ?? "live"],
  )
}

export async function listPlatformAnalytics(input: {
  userId: string
  platformId: string
  rangeHours: number
}): Promise<PlatformAnalytics[]> {
  await ensureMultiStreamingTables()

  const rows = await queryMany<PlatformAnalytics & { timestamp: string | Date }>(
    `
      SELECT
        platform_id,
        viewers,
        chat_messages,
        likes,
        shares,
        followers_gained,
        watch_time,
        peak_viewers,
        engagement_rate,
        stream_health,
        bitrate_actual,
        fps_actual,
        dropped_frames,
        timestamp
      FROM platform_analytics_snapshots
      WHERE user_id = $1
        AND platform_id = $2
        AND timestamp >= NOW() - ($3::int * INTERVAL '1 hour')
      ORDER BY timestamp ASC
    `,
    [input.userId, input.platformId, input.rangeHours],
  )

  return rows.map((row) => ({
    ...row,
    timestamp: new Date(row.timestamp).toISOString(),
  }))
}

export async function listSessionPlatformAnalytics(input: {
  userId: string
  sessionId: string
}): Promise<(PlatformAnalytics & { platform_name: string })[]> {
  await ensureMultiStreamingTables()

  const rows = await queryMany<PlatformAnalytics & { platform_name: string; timestamp: string | Date }>(
    `
      SELECT DISTINCT ON (pas.platform_id)
        pas.platform_id,
        pas.viewers,
        pas.chat_messages,
        pas.likes,
        pas.shares,
        pas.followers_gained,
        pas.watch_time,
        pas.peak_viewers,
        pas.engagement_rate,
        pas.stream_health,
        pas.bitrate_actual,
        pas.fps_actual,
        pas.dropped_frames,
        pas.timestamp,
        COALESCE(msps.platform_name, pas.platform_id) AS platform_name
      FROM platform_analytics_snapshots pas
      LEFT JOIN multi_stream_platform_states msps
        ON msps.session_id = pas.session_id
       AND msps.platform_id = pas.platform_id
      WHERE pas.user_id = $1
        AND pas.session_id = $2
      ORDER BY pas.platform_id, pas.timestamp DESC
    `,
    [input.userId, input.sessionId],
  )

  return rows.map((row) => ({
    ...row,
    timestamp: new Date(row.timestamp).toISOString(),
  }))
}

export async function updatePlatformCustomTitle(input: {
  platformId: string
  userId: string
  title: string
}): Promise<boolean> {
  await ensureMultiStreamingTables()

  const row = await queryOne<{ id: string }>(
    `
      UPDATE streaming_platforms
      SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{custom_title}', to_jsonb($1::text), true),
          updated_at = NOW()
      WHERE id = $2
        AND user_id = $3
        AND COALESCE((settings ->> 'enable_auto_title')::boolean, true) = true
      RETURNING id
    `,
    [input.title, input.platformId, input.userId],
  )

  return Boolean(row?.id)
}

function mapSessionRecord(row: MultiStreamSessionRecord): MultiStreamSession {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    platforms: row.platforms ?? [],
    status: row.status,
    start_time: row.start_time ? new Date(row.start_time).toISOString() : undefined,
    end_time: row.end_time ? new Date(row.end_time).toISOString() : undefined,
    total_viewers: row.total_viewers ?? 0,
    peak_viewers: row.peak_viewers ?? 0,
    duration: row.duration ?? 0,
    settings: row.settings,
  }
}
