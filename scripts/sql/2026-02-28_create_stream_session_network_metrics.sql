-- Additive migration for stream network telemetry ingestion + historical analytics.
-- Backward compatibility: existing stream session APIs and schema remain unchanged.
-- Retention policy: keep only the latest 30 days of stream_session_network_metrics data.

CREATE TABLE IF NOT EXISTS stream_session_network_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  stream_id text,
  bitrate_kbps double precision NOT NULL,
  rtt_ms double precision NOT NULL,
  packet_loss_pct double precision NOT NULL,
  dropped_frames integer NOT NULL DEFAULT 0,
  reconnects integer NOT NULL DEFAULT 0,
  health_state text NOT NULL CHECK (health_state IN ('excellent', 'good', 'fair', 'poor')),
  health_score integer NOT NULL,
  sampled_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stream_network_metrics_session_sampled
  ON stream_session_network_metrics(session_id, sampled_at DESC);

CREATE INDEX IF NOT EXISTS idx_stream_network_metrics_stream_sampled
  ON stream_session_network_metrics(stream_id, sampled_at DESC);

-- Retention sweep for managed environments without background workers.
DELETE FROM stream_session_network_metrics
WHERE sampled_at < NOW() - INTERVAL '30 days';
