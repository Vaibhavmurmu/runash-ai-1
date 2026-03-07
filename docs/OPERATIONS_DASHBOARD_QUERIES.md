# Operations Dashboard Queries & Panels

## Core Panels
1. **Session Start Success/Fail Rate**
   - `sum(rate(ops_session_start_success_total[5m]))`
   - `sum(rate(ops_session_start_failed_total[5m]))`
   - Failure rate: `failed / clamp_min(success + failed, 1)`

2. **Live Stream Uptime Distribution**
   - `histogram_quantile(0.5, sum(rate(ops_stream_uptime_seconds_bucket[15m])) by (le))`
   - `histogram_quantile(0.95, sum(rate(ops_stream_uptime_seconds_bucket[15m])) by (le))`

3. **Generation Queue Latency (p95)**
   - `histogram_quantile(0.95, sum(rate(ops_job_queue_latency_ms_bucket[5m])) by (le))`

4. **Generation Failure Buckets by Provider/Code**
   - `sum by (provider, code) (increase(ops_generation_failure_bucket_total[15m]))`

5. **Media Ingest & Transcode Success Ratio**
   - `sum(rate(ops_media_ingest_success_total[5m])) / clamp_min(sum(rate(ops_media_ingest_success_total[5m])) + sum(rate(ops_media_ingest_failed_total[5m])), 1)`
   - `sum(rate(ops_media_transcode_success_total[5m])) / clamp_min(sum(rate(ops_media_transcode_success_total[5m])) + sum(rate(ops_media_transcode_failed_total[5m])), 1)`

6. **Provider Latency (Tracing-derived)**
   - span: `live_chat.provider.generate_reply`
   - p95 by provider over 5m

## Suggested Dashboard Layout
- Row 1: Global health (failure rate, queue latency p95, stuck jobs)
- Row 2: Live sessions (start rate, uptime quantiles)
- Row 3: Generation workers (throughput, failure buckets)
- Row 4: Media ingest/transcode (success ratio + latency)
- Row 5: Trace drill-down (top slow spans and failing spans)

## Alert Rules Mapping
- Session failure rate > 8% for 10m
- Queue p95 latency > 30s for 10m
- Generation failures >= 20/5m
- Provider span p95 > 4s for 10m
- Stuck jobs >= 8 for 15m
