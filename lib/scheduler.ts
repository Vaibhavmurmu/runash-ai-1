import { randomUUID } from "crypto"
import path from "path"
import { writeFileSync } from "fs"
import { queryMany, queryOne } from "@/lib/db"
import { getDashboardData } from "./data-source"
import { sendReportEmail } from "./emails"

export type ScheduleFrequency = "hourly" | "daily" | "weekly" | "monthly"
export type ScheduledJobType = "report_generation" | "notification_dispatch" | "support_bot_automation"

type ScheduleRecord = {
  id: string
  name: string
  frequency: ScheduleFrequency
  recipients: string | null
  format: "CSV" | "PDF" | "Excel"
  jobType: ScheduledJobType
  active: boolean
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

export type ScheduleWithState = {
  id: string
  name: string
  frequency: ScheduleFrequency
  recipients?: string
  format: "CSV" | "PDF" | "Excel"
  jobType: ScheduledJobType
  nextRun: string | null
  createdAt: string
  updatedAt: string
  lastRun: string | null
  lastStatus: "queued" | "processing" | "succeeded" | "failed" | null
  lastError: string | null
}

const WORKER_LEASE_TTL_SECONDS = 90

let initPromise: Promise<void> | null = null

function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function nextRunFromFrequency(freq: ScheduleFrequency, fromDate = new Date()): Date {
  const next = new Date(fromDate)
  switch (freq) {
    case "hourly":
      next.setMinutes(0, 0, 0)
      next.setHours(next.getHours() + 1)
      return next
    case "daily":
      next.setHours(0, 0, 0, 0)
      next.setDate(next.getDate() + 1)
      return next
    case "weekly": {
      next.setHours(0, 0, 0, 0)
      const day = next.getDay()
      const daysUntilSunday = day === 0 ? 7 : 7 - day
      next.setDate(next.getDate() + daysUntilSunday)
      return next
    }
    case "monthly":
      next.setHours(0, 0, 0, 0)
      next.setMonth(next.getMonth() + 1, 1)
      return next
    default:
      return new Date(Date.now() + 60 * 60 * 1000)
  }
}

async function ensureSchedulerTables() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    await queryMany(`
      CREATE TABLE IF NOT EXISTS scheduler_schedules (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        frequency text NOT NULL,
        recipients text,
        format text NOT NULL DEFAULT 'CSV',
        job_type text NOT NULL DEFAULT 'report_generation',
        active boolean NOT NULL DEFAULT true,
        next_run_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)

    await queryMany(`
      CREATE TABLE IF NOT EXISTS scheduler_job_queue (
        id uuid PRIMARY KEY,
        schedule_id uuid NOT NULL REFERENCES scheduler_schedules(id) ON DELETE CASCADE,
        job_type text NOT NULL,
        idempotency_key text NOT NULL,
        due_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'queued',
        attempts integer NOT NULL DEFAULT 0,
        max_attempts integer NOT NULL DEFAULT 3,
        last_error text,
        lock_token text,
        locked_at timestamptz,
        next_retry_at timestamptz,
        processed_at timestamptz,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (idempotency_key)
      )
    `)

    await queryMany(`
      CREATE TABLE IF NOT EXISTS scheduler_workflow_runs (
        id uuid PRIMARY KEY,
        queue_id uuid REFERENCES scheduler_job_queue(id) ON DELETE SET NULL,
        schedule_id uuid NOT NULL REFERENCES scheduler_schedules(id) ON DELETE CASCADE,
        job_type text NOT NULL,
        idempotency_key text NOT NULL,
        state text NOT NULL,
        attempt integer NOT NULL DEFAULT 1,
        error_message text,
        started_at timestamptz NOT NULL DEFAULT NOW(),
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE (idempotency_key)
      )
    `)

    await queryMany(`
      CREATE TABLE IF NOT EXISTS scheduler_execution_logs (
        id bigserial PRIMARY KEY,
        schedule_id uuid REFERENCES scheduler_schedules(id) ON DELETE CASCADE,
        queue_id uuid REFERENCES scheduler_job_queue(id) ON DELETE SET NULL,
        workflow_run_id uuid REFERENCES scheduler_workflow_runs(id) ON DELETE SET NULL,
        level text NOT NULL,
        message text NOT NULL,
        context jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)

    await queryMany(`
      CREATE TABLE IF NOT EXISTS scheduler_worker_leases (
        lease_name text PRIMARY KEY,
        worker_id text NOT NULL,
        leased_until timestamptz NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `)

    await queryMany(`CREATE INDEX IF NOT EXISTS idx_scheduler_schedules_next_run ON scheduler_schedules(next_run_at) WHERE active = true`)
    await queryMany(`CREATE INDEX IF NOT EXISTS idx_scheduler_job_queue_due ON scheduler_job_queue(COALESCE(next_retry_at, due_at), status)`)
    await queryMany(`CREATE INDEX IF NOT EXISTS idx_scheduler_workflow_runs_schedule_started ON scheduler_workflow_runs(schedule_id, started_at DESC)`)
  })()

  return initPromise
}

async function enqueueNextRun(schedule: ScheduleRecord, dueAt: Date) {
  const idempotencyKey = `${schedule.jobType}:${schedule.id}:${dueAt.toISOString()}`
  await queryMany(
    `INSERT INTO scheduler_job_queue (id, schedule_id, job_type, idempotency_key, due_at, status)
     VALUES ($1, $2, $3, $4, $5, 'queued')
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [randomUUID(), schedule.id, schedule.jobType, idempotencyKey, dueAt.toISOString()],
  )
}

async function logExecution(scheduleId: string, queueId: string | null, workflowRunId: string | null, level: "info" | "error", message: string, context?: Record<string, unknown>) {
  await queryMany(
    `INSERT INTO scheduler_execution_logs (schedule_id, queue_id, workflow_run_id, level, message, context)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [scheduleId, queueId, workflowRunId, level, message, JSON.stringify(context ?? {})],
  )
}

async function runReport(schedule: ScheduleRecord) {
  const data = await getDashboardData()
  const rows = [["date", "viewers", "followers", "revenue"], ...data.overview.map((r) => [r.date, String(r.viewers), String(r.followers), String(r.revenue)])]
  const csv = rows.map((r) => r.join(",")).join("\n")
  const filename = `${schedule.name.replace(/\s+/g, "_")}_${Date.now()}.csv`
  const outPath = path.join(process.cwd(), "data", "reports")

  try {
    writeFileSync(path.join(outPath, filename), csv)
  } catch {
    // Optional local disk output, ignore if unavailable.
  }

  if (schedule.recipients) {
    await sendReportEmail({
      to: schedule.recipients.split(",").map((x) => x.trim()).filter(Boolean),
      subject: `Scheduled Analytics Report: ${schedule.name}`,
      text: `Attached report: ${schedule.name}`,
      attachments: [{ filename, content: Buffer.from(csv, "utf-8"), contentType: "text/csv" }],
    })
  }
}

async function runNotificationDispatch(schedule: ScheduleRecord) {
  await logExecution(schedule.id, null, null, "info", "Notification dispatch placeholder executed", { scheduleId: schedule.id })
}

async function runSupportBotAutomation(schedule: ScheduleRecord) {
  await logExecution(schedule.id, null, null, "info", "Support bot automation placeholder executed", { scheduleId: schedule.id })
}

async function executeJob(schedule: ScheduleRecord) {
  switch (schedule.jobType) {
    case "report_generation":
      await runReport(schedule)
      return
    case "notification_dispatch":
      await runNotificationDispatch(schedule)
      return
    case "support_bot_automation":
      await runSupportBotAutomation(schedule)
      return
    default:
      throw new Error(`Unsupported scheduled job type: ${schedule.jobType}`)
  }
}

async function acquireWorkerLease(workerId: string, leaseName = "scheduler-primary"): Promise<boolean> {
  await ensureSchedulerTables()
  const updated = await queryMany<{ worker_id: string }>(
    `UPDATE scheduler_worker_leases
     SET worker_id = $2,
         leased_until = NOW() + (($3::text || ' seconds')::interval),
         updated_at = NOW()
     WHERE lease_name = $1
       AND (leased_until < NOW() OR worker_id = $2)
     RETURNING worker_id`,
    [leaseName, workerId, String(WORKER_LEASE_TTL_SECONDS)],
  )

  if (updated.length > 0) return true

  const inserted = await queryMany<{ worker_id: string }>(
    `INSERT INTO scheduler_worker_leases (lease_name, worker_id, leased_until)
     VALUES ($1, $2, NOW() + (($3::text || ' seconds')::interval))
     ON CONFLICT (lease_name) DO NOTHING
     RETURNING worker_id`,
    [leaseName, workerId, String(WORKER_LEASE_TTL_SECONDS)],
  )

  return inserted.length > 0
}

export async function addSchedule({
  name,
  frequency,
  recipients,
  format,
  jobType,
}: {
  name: string
  frequency: ScheduleFrequency | string
  recipients?: string
  format?: string
  jobType?: ScheduledJobType
}) {
  await ensureSchedulerTables()
  const id = randomUUID()
  const normalizedFrequency = (frequency as ScheduleFrequency) || "daily"
  const normalizedJobType = jobType || "report_generation"
  const now = new Date()
  const nextRun = nextRunFromFrequency(normalizedFrequency, now)

  await queryMany(
    `INSERT INTO scheduler_schedules (id, name, frequency, recipients, format, job_type, active, next_run_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
    [id, name, normalizedFrequency, recipients ?? null, (format as any) || "CSV", normalizedJobType, nextRun.toISOString()],
  )

  const created = await queryOne<{
    id: string
    name: string
    frequency: ScheduleFrequency
    recipients: string | null
    format: "CSV" | "PDF" | "Excel"
    job_type: ScheduledJobType
    next_run_at: string | null
    created_at: string
    updated_at: string
  }>(
    `SELECT id, name, frequency, recipients, format, job_type, next_run_at, created_at, updated_at
     FROM scheduler_schedules
     WHERE id = $1`,
    [id],
  )

  if (!created) throw new Error("Failed to create schedule")

  await enqueueNextRun(
    {
      id: created.id,
      name: created.name,
      frequency: created.frequency,
      recipients: created.recipients,
      format: created.format,
      jobType: created.job_type,
      active: true,
      nextRunAt: toIso(created.next_run_at),
      createdAt: toIso(created.created_at) || now.toISOString(),
      updatedAt: toIso(created.updated_at) || now.toISOString(),
    },
    nextRun,
  )

  return {
    id: created.id,
    name: created.name,
    frequency: created.frequency,
    recipients: created.recipients ?? undefined,
    format: created.format,
    jobType: created.job_type,
    nextRun: toIso(created.next_run_at),
    createdAt: toIso(created.created_at) || now.toISOString(),
    updatedAt: toIso(created.updated_at) || now.toISOString(),
  }
}

export async function listSchedules(): Promise<ScheduleWithState[]> {
  await ensureSchedulerTables()
  const rows = await queryMany<{
    id: string
    name: string
    frequency: ScheduleFrequency
    recipients: string | null
    format: "CSV" | "PDF" | "Excel"
    job_type: ScheduledJobType
    next_run_at: string | null
    created_at: string
    updated_at: string
    last_started_at: string | null
    last_state: "queued" | "processing" | "succeeded" | "failed" | null
    last_error: string | null
  }>(
    `SELECT s.id, s.name, s.frequency, s.recipients, s.format, s.job_type, s.next_run_at, s.created_at, s.updated_at,
            wr.started_at AS last_started_at,
            wr.state AS last_state,
            wr.error_message AS last_error
     FROM scheduler_schedules s
     LEFT JOIN LATERAL (
       SELECT started_at, state, error_message
       FROM scheduler_workflow_runs
       WHERE schedule_id = s.id
       ORDER BY started_at DESC
       LIMIT 1
     ) wr ON true
     WHERE s.active = true
     ORDER BY s.created_at DESC`,
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    frequency: row.frequency,
    recipients: row.recipients ?? undefined,
    format: row.format,
    jobType: row.job_type,
    nextRun: toIso(row.next_run_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
    lastRun: toIso(row.last_started_at),
    lastStatus: row.last_state,
    lastError: row.last_error,
  }))
}

export async function removeSchedule(id: string) {
  await ensureSchedulerTables()
  await queryMany(`UPDATE scheduler_schedules SET active = false, updated_at = NOW() WHERE id = $1`, [id])
  await queryMany(`UPDATE scheduler_job_queue SET status = 'cancelled', updated_at = NOW() WHERE schedule_id = $1 AND status IN ('queued', 'processing', 'failed')`, [id])
  return true
}

export async function processDueScheduledJobs(options?: { workerId?: string; limit?: number }) {
  await ensureSchedulerTables()
  const workerId = options?.workerId || `worker-${process.pid}`
  const hasLease = await acquireWorkerLease(workerId)
  if (!hasLease) {
    return { processed: 0, skipped: true }
  }

  const limit = options?.limit ?? 10
  const lockToken = `${workerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const jobs = await queryMany<{
    id: string
    schedule_id: string
    idempotency_key: string
    attempts: number
    max_attempts: number
    job_type: ScheduledJobType
  }>(
    `WITH due AS (
       SELECT id
       FROM scheduler_job_queue
       WHERE status IN ('queued', 'failed')
         AND COALESCE(next_retry_at, due_at) <= NOW()
         AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
       ORDER BY COALESCE(next_retry_at, due_at) ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE scheduler_job_queue q
     SET status = 'processing',
         locked_at = NOW(),
         lock_token = $2,
         attempts = attempts + 1,
         updated_at = NOW()
     FROM due
     WHERE q.id = due.id
     RETURNING q.id, q.schedule_id, q.idempotency_key, q.attempts, q.max_attempts, q.job_type`,
    [limit, lockToken],
  )

  let processed = 0

  for (const job of jobs) {
    const schedule = await queryOne<{
      id: string
      name: string
      frequency: ScheduleFrequency
      recipients: string | null
      format: "CSV" | "PDF" | "Excel"
      job_type: ScheduledJobType
      active: boolean
      next_run_at: string | null
      created_at: string
      updated_at: string
    }>(
      `SELECT id, name, frequency, recipients, format, job_type, active, next_run_at, created_at, updated_at
       FROM scheduler_schedules
       WHERE id = $1`,
      [job.schedule_id],
    )

    if (!schedule || !schedule.active) {
      await queryMany(`UPDATE scheduler_job_queue SET status = 'cancelled', lock_token = NULL, locked_at = NULL, updated_at = NOW() WHERE id = $1`, [job.id])
      continue
    }

    const workflowRunId = randomUUID()
    await queryMany(
      `INSERT INTO scheduler_workflow_runs (id, queue_id, schedule_id, job_type, idempotency_key, state, attempt)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6)
       ON CONFLICT (idempotency_key)
       DO NOTHING`,
      [workflowRunId, job.id, schedule.id, schedule.job_type, job.idempotency_key, job.attempts],
    )

    const run = await queryOne<{ id: string; state: string }>(`SELECT id, state FROM scheduler_workflow_runs WHERE idempotency_key = $1`, [job.idempotency_key])
    if (run?.state === "succeeded") {
      await queryMany(`UPDATE scheduler_job_queue SET status = 'succeeded', processed_at = NOW(), lock_token = NULL, locked_at = NULL, updated_at = NOW() WHERE id = $1`, [job.id])
      continue
    }

    try {
      await executeJob(
        {
          id: schedule.id,
          name: schedule.name,
          frequency: schedule.frequency,
          recipients: schedule.recipients,
          format: schedule.format,
          jobType: schedule.job_type,
          active: schedule.active,
          nextRunAt: toIso(schedule.next_run_at),
          createdAt: toIso(schedule.created_at) || new Date().toISOString(),
          updatedAt: toIso(schedule.updated_at) || new Date().toISOString(),
        },
      )

      await queryMany(`UPDATE scheduler_workflow_runs SET state = 'succeeded', error_message = NULL, completed_at = NOW(), updated_at = NOW() WHERE id = $1`, [run?.id || workflowRunId])
      await queryMany(`UPDATE scheduler_job_queue SET status = 'succeeded', lock_token = NULL, locked_at = NULL, last_error = NULL, processed_at = NOW(), updated_at = NOW() WHERE id = $1`, [job.id])
      await logExecution(schedule.id, job.id, run?.id || workflowRunId, "info", "Scheduled job completed", {
        idempotencyKey: job.idempotency_key,
        jobType: schedule.job_type,
      })

      const nextRun = nextRunFromFrequency(schedule.frequency)
      await queryMany(`UPDATE scheduler_schedules SET next_run_at = $2, updated_at = NOW() WHERE id = $1`, [schedule.id, nextRun.toISOString()])
      await enqueueNextRun(
        {
          id: schedule.id,
          name: schedule.name,
          frequency: schedule.frequency,
          recipients: schedule.recipients,
          format: schedule.format,
          jobType: schedule.job_type,
          active: schedule.active,
          nextRunAt: nextRun.toISOString(),
          createdAt: toIso(schedule.created_at) || new Date().toISOString(),
          updatedAt: toIso(schedule.updated_at) || new Date().toISOString(),
        },
        nextRun,
      )
      processed += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduled job error"
      const shouldRetry = job.attempts < job.max_attempts
      await queryMany(
        `UPDATE scheduler_workflow_runs
         SET state = 'failed', error_message = $2, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [run?.id || workflowRunId, message],
      )
      await queryMany(
        `UPDATE scheduler_job_queue
         SET status = $2,
             last_error = $3,
             next_retry_at = CASE WHEN $4 THEN NOW() + INTERVAL '5 minutes' ELSE NULL END,
             lock_token = NULL,
             locked_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [job.id, shouldRetry ? "failed" : "dead", message, shouldRetry],
      )

      await logExecution(schedule.id, job.id, run?.id || workflowRunId, "error", "Scheduled job failed", {
        idempotencyKey: job.idempotency_key,
        attempt: job.attempts,
        shouldRetry,
      })
    }
  }

  return { processed, skipped: false }
}
