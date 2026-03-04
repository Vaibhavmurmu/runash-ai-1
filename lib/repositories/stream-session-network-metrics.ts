import { queryMany, queryOne, sql } from "@/lib/db"
import {
  NETWORK_TELEMETRY_RETENTION_DAYS,
  calculateHealthScore,
  deriveStreamHealthState,
  type StreamHealthState,
} from "@/lib/stream-network-telemetry"

export interface StreamSessionNetworkMetricRecord {
  id: string
  sessionId: string
  streamId: string | null
  bitrateKbps: number
  rttMs: number
  packetLossPct: number
  droppedFrames: number
  reconnects: number
  healthState: StreamHealthState
  healthScore: number
  sampledAt: Date
  createdAt: Date
}

let networkMetricsTableReady = false
let lastRetentionSweepAt = 0

async function ensureTable() {
  if (networkMetricsTableReady) return

  await (sql as { unsafe: (query: string, params?: unknown[]) => Promise<unknown> }).unsafe(`
    CREATE TABLE IF NOT EXISTS stream_session_network_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      stream_id TEXT,
      bitrate_kbps DOUBLE PRECISION NOT NULL,
      rtt_ms DOUBLE PRECISION NOT NULL,
      packet_loss_pct DOUBLE PRECISION NOT NULL,
      dropped_frames INTEGER NOT NULL DEFAULT 0,
      reconnects INTEGER NOT NULL DEFAULT 0,
      health_state TEXT NOT NULL CHECK (health_state IN ('excellent', 'good', 'fair', 'poor')),
      health_score INTEGER NOT NULL,
      sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stream_network_metrics_session_sampled
      ON stream_session_network_metrics (session_id, sampled_at DESC);

    CREATE INDEX IF NOT EXISTS idx_stream_network_metrics_stream_sampled
      ON stream_session_network_metrics (stream_id, sampled_at DESC);
  `)

  networkMetricsTableReady = true
}

async function applyRetentionPolicyIfDue() {
  const now = Date.now()
  if (now - lastRetentionSweepAt < 15 * 60 * 1000) return
  lastRetentionSweepAt = now

  await queryMany(
    `
      DELETE FROM stream_session_network_metrics
      WHERE sampled_at < NOW() - ($1::int * INTERVAL '1 day')
    `,
    [NETWORK_TELEMETRY_RETENTION_DAYS],
  )
}

function mapRow(row: StreamSessionNetworkMetricRecord): StreamSessionNetworkMetricRecord {
  return {
    ...row,
    sampledAt: new Date(row.sampledAt),
    createdAt: new Date(row.createdAt),
  }
}

export async function createStreamSessionNetworkMetric(input: {
  sessionId: string
  streamId?: string | null
  bitrateKbps: number
  rttMs: number
  packetLossPct: number
  droppedFrames: number
  reconnects: number
  sampledAt?: Date
}) {
  await ensureTable()
  await applyRetentionPolicyIfDue()

  const healthState = deriveStreamHealthState({
    bitrateKbps: input.bitrateKbps,
    rttMs: input.rttMs,
    packetLossPct: input.packetLossPct,
    droppedFrames: input.droppedFrames,
    reconnects: input.reconnects,
  })
  const healthScore = calculateHealthScore(healthState)

  const row = await queryOne<StreamSessionNetworkMetricRecord>(
    `
      INSERT INTO stream_session_network_metrics (
        session_id, stream_id, bitrate_kbps, rtt_ms, packet_loss_pct, dropped_frames, reconnects, health_state, health_score, sampled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        session_id AS "sessionId",
        stream_id AS "streamId",
        bitrate_kbps AS "bitrateKbps",
        rtt_ms AS "rttMs",
        packet_loss_pct AS "packetLossPct",
        dropped_frames AS "droppedFrames",
        reconnects,
        health_state AS "healthState",
        health_score AS "healthScore",
        sampled_at AS "sampledAt",
        created_at AS "createdAt"
    `,
    [
      input.sessionId,
      input.streamId ?? null,
      input.bitrateKbps,
      input.rttMs,
      input.packetLossPct,
      input.droppedFrames,
      input.reconnects,
      healthState,
      healthScore,
      (input.sampledAt ?? new Date()).toISOString(),
    ],
  )

  if (!row) throw new Error("Failed to persist stream network metric")
  return mapRow(row)
}

export async function listStreamSessionNetworkMetrics(sessionId: string, limit = 120) {
  await ensureTable()

  const rows = await queryMany<StreamSessionNetworkMetricRecord>(
    `
      SELECT
        id,
        session_id AS "sessionId",
        stream_id AS "streamId",
        bitrate_kbps AS "bitrateKbps",
        rtt_ms AS "rttMs",
        packet_loss_pct AS "packetLossPct",
        dropped_frames AS "droppedFrames",
        reconnects,
        health_state AS "healthState",
        health_score AS "healthScore",
        sampled_at AS "sampledAt",
        created_at AS "createdAt"
      FROM stream_session_network_metrics
      WHERE session_id = $1
      ORDER BY sampled_at DESC
      LIMIT $2
    `,
    [sessionId, limit],
  )

  return rows.map(mapRow).reverse()
}
