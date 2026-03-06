# Operations Observability Runbook

## Scope
This runbook covers production incidents for:
- live session lifecycle APIs
- generation queue and worker pipelines
- media ingest/transcode finalize callbacks

## Signals Added
- Structured logs use `correlationId` and `requestId` for session/job/media flows.
- Metrics emitted with `[metrics.ops]` include:
  - `ops.session_start.success` / `ops.session_start.failed`
  - `ops.stream_uptime.seconds`
  - `ops.job_queue_latency.ms`
  - `ops.generation_failure.bucket` (tagged by `provider` and `code`)
  - `ops.media_ingest.success` / `ops.media_ingest.failed`
  - `ops.media_transcode.success` / `ops.media_transcode.failed`
- Distributed tracing spans emitted with `[trace]`:
  - `live_chat.session.create`
  - `live_chat.provider.generate_reply`
  - `clip_pipeline.media_ingest`
  - `clip_pipeline.db.persist_assets`
  - `media.transcode.job.create`
  - `media.transcode.queue`

## Alert Thresholds
Default thresholds are defined by `getOpsAlertThresholds()`:
- Error spike (`ops.generation_failure.bucket`) in 5m: `>= 20`
- Stuck jobs over 15m: `>= 8`
- Queue latency p95 (`ops.job_queue_latency.ms`): `> 30000`
- Session start failure rate over 5m: `> 8%`
- Provider latency p95 over 5m: `> 4000ms`

## Incident Playbooks

### 1) Session start failures spike
1. Filter logs on `event=seller.live_chat.session.create_failed` and group by `correlationId`.
2. Check API auth regressions and DB write failures for `ai_live_chat_sessions`.
3. If endpoint/provider induced, disable AI endpoint override and rely on fallback assistant.
4. Roll back latest release if failure rate stays above threshold for >10 minutes.

### 2) Stuck or slow generation jobs
1. Query jobs in `clip_jobs` where `status in ('queued','processing')` and stale `updated_at`.
2. Use `jobId` + `correlationId` to inspect worker logs.
3. Identify failing provider/code via `ops.generation_failure.bucket` tags.
4. Retry affected jobs selectively; if systemic, toggle traffic away from degraded provider.

### 3) Media ingest/transcode issues
1. Search `media.upload.finalize.completed` absence by `assetId`.
2. Inspect `media_transcode_jobs` and `media_variants` creation latency.
3. If queue latency high, reduce non-critical ingest traffic and prioritize short clips.
4. Roll back transcode pipeline deployment if completion rate drops below SLO.

## Rollback Steps
1. Revert to previous deploy artifact.
2. Disable high-risk feature paths via runtime flags/config where available.
3. Re-run health checks:
   - session create/join/end API smoke
   - clip generate + job fetch
   - media upload finalize + variant delivery
4. Keep rollback active until metrics normalize for 30 continuous minutes.

## Post-Incident
- Capture `correlationId`, impacted provider/code buckets, and timeline.
- Record mitigation + permanent fix in incident notes.
