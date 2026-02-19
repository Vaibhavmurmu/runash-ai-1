import { neon } from "@neondatabase/serverless"
import { EmailContactManager } from "@/lib/email-contacts"
import { sendEmail } from "@/lib/email"
import { renderBroadcastTemplate, type BroadcastTemplateProps } from "@/lib/email-broadcast-templates"
import { triggerBroadcastProgressEvent } from "@/lib/email-realtime"
import type { EmailBroadcast } from "@/lib/email-broadcasts"

const sql = neon(process.env.DATABASE_URL!)

export interface EnqueueBroadcastOptions {
  scheduledAt?: string | null
  triggeredBy?: "manual" | "schedule"
}

interface BroadcastRecipientTask {
  id: number
  recipient_email: string
  attempts: number
  max_attempts: number
  lock_token: string
  contact_name: string | null
}

function toDateIso(value?: string | null): string {
  return value || new Date().toISOString()
}

function getBackoffMinutes(attempt: number): number {
  return Math.min(60, 2 ** Math.max(0, attempt - 1))
}

async function syncRecipients(broadcast: EmailBroadcast) {
  const filterStatus = String((broadcast.audience_filter?.status as string) || "subscribed")
  const contacts = await EmailContactManager.getContacts({ status: filterStatus, limit: 1000, offset: 0 })

  if (contacts.contacts.length > 0) {
    await Promise.all(
      contacts.contacts.map((contact) =>
        sql`
          INSERT INTO email_broadcast_recipients (broadcast_id, contact_id, recipient_email, status, idempotency_key)
          VALUES (${broadcast.id}, ${contact.id}, ${contact.email}, 'pending', ${`broadcast-${broadcast.id}-${contact.email.toLowerCase()}`})
          ON CONFLICT (broadcast_id, recipient_email)
          DO UPDATE SET
            contact_id = COALESCE(email_broadcast_recipients.contact_id, EXCLUDED.contact_id),
            idempotency_key = COALESCE(email_broadcast_recipients.idempotency_key, EXCLUDED.idempotency_key)
        `,
      ),
    )
  }

  await sql`
    UPDATE email_broadcasts
    SET total_recipients = ${contacts.total}, updated_at = NOW()
    WHERE id = ${broadcast.id}
  `
}

async function claimDueJobs(limit: number) {
  const lockToken = `job-lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return sql.query(
    `
    WITH due AS (
      SELECT id
      FROM email_broadcast_jobs
      WHERE status IN ('queued', 'failed')
        AND COALESCE(next_retry_at, scheduled_for) <= NOW()
        AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
      ORDER BY scheduled_for ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE email_broadcast_jobs j
    SET
      status = 'processing',
      locked_at = NOW(),
      lock_token = $2,
      attempts = attempts + 1,
      updated_at = NOW()
    FROM due
    WHERE j.id = due.id
    RETURNING j.*
  `,
    [limit, lockToken],
  )
}

async function claimRecipientBatch(broadcastId: number, batchSize: number) {
  const recipientLock = `recipient-lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return sql.query(
    `
    WITH due AS (
      SELECT r.id
      FROM email_broadcast_recipients r
      WHERE r.broadcast_id = $1
        AND r.status IN ('pending', 'failed')
        AND COALESCE(r.next_retry_at, r.created_at) <= NOW()
        AND r.attempts < r.max_attempts
        AND (r.locked_at IS NULL OR r.locked_at < NOW() - INTERVAL '5 minutes')
      ORDER BY r.id ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED
    )
    UPDATE email_broadcast_recipients r
    SET
      status = 'processing',
      locked_at = NOW(),
      lock_token = $3,
      attempts = attempts + 1,
      updated_at = NOW()
    FROM due
    WHERE r.id = due.id
    RETURNING r.id, r.recipient_email, r.attempts, r.max_attempts, r.lock_token,
      (SELECT c.name FROM email_contacts c WHERE c.id = r.contact_id) AS contact_name
  `,
    [broadcastId, batchSize, recipientLock],
  ) as Promise<BroadcastRecipientTask[]>
}

async function refreshBroadcastCounters(broadcastId: number) {
  await sql`
    UPDATE email_broadcasts b
    SET
      sent_count = counters.sent_count,
      failed_count = counters.failed_count,
      updated_at = NOW()
    FROM (
      SELECT
        broadcast_id,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
      FROM email_broadcast_recipients
      WHERE broadcast_id = ${broadcastId}
      GROUP BY broadcast_id
    ) AS counters
    WHERE b.id = counters.broadcast_id
  `
}

async function finalizeIfCompleted(jobId: number, broadcastId: number) {
  const rows = await sql.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'failed' AND attempts >= max_attempts)::int AS terminal_failed
    FROM email_broadcast_recipients
    WHERE broadcast_id = $1
  `,
    [broadcastId],
  )

  const activeCount = Number(rows[0]?.active_count || 0)
  const terminalFailed = Number(rows[0]?.terminal_failed || 0)

  if (activeCount > 0) {
    await sql`
      UPDATE email_broadcast_jobs
      SET
        status = 'queued',
        next_retry_at = NOW() + INTERVAL '30 seconds',
        locked_at = NULL,
        lock_token = NULL,
        updated_at = NOW()
      WHERE id = ${jobId}
    `
    return
  }

  const finalStatus = terminalFailed > 0 ? "failed" : "sent"

  await sql`
    UPDATE email_broadcasts
    SET
      status = ${finalStatus},
      sent_at = CASE WHEN ${finalStatus} = 'sent' THEN NOW() ELSE sent_at END,
      last_error = ${terminalFailed > 0 ? "Some recipients failed during send" : null},
      updated_at = NOW()
    WHERE id = ${broadcastId}
  `

  await sql`
    UPDATE email_broadcast_jobs
    SET
      status = ${terminalFailed > 0 ? "failed" : "completed"},
      processed_at = NOW(),
      locked_at = NULL,
      lock_token = NULL,
      updated_at = NOW()
    WHERE id = ${jobId}
  `

  const broadcastRows = await sql`SELECT sent_count, failed_count, total_recipients FROM email_broadcasts WHERE id = ${broadcastId}`
  const stats = broadcastRows[0]
  triggerBroadcastProgressEvent({
    broadcastId,
    status: terminalFailed > 0 ? "failed" : "sent",
    sentCount: Number(stats?.sent_count || 0),
    failedCount: Number(stats?.failed_count || 0),
    totalRecipients: Number(stats?.total_recipients || 0),
  })
}

export async function enqueueBroadcastJob(broadcastId: number, options: EnqueueBroadcastOptions = {}) {
  const scheduledFor = toDateIso(options.scheduledAt)

  const rows = await sql.query(
    `
    INSERT INTO email_broadcast_jobs (broadcast_id, status, scheduled_for, next_retry_at, triggered_by)
    VALUES ($1, 'queued', $2::timestamptz, $2::timestamptz, $3)
    ON CONFLICT (broadcast_id)
    DO UPDATE SET
      status = CASE WHEN email_broadcast_jobs.status = 'completed' THEN 'queued' ELSE email_broadcast_jobs.status END,
      scheduled_for = LEAST(email_broadcast_jobs.scheduled_for, EXCLUDED.scheduled_for),
      next_retry_at = LEAST(COALESCE(email_broadcast_jobs.next_retry_at, EXCLUDED.next_retry_at), EXCLUDED.next_retry_at),
      locked_at = NULL,
      lock_token = NULL,
      updated_at = NOW(),
      triggered_by = EXCLUDED.triggered_by
    RETURNING *
  `,
    [broadcastId, scheduledFor, options.triggeredBy || "schedule"],
  )

  await sql`
    UPDATE email_broadcasts
    SET status = CASE WHEN status = 'sent' THEN status ELSE 'scheduled' END, updated_at = NOW()
    WHERE id = ${broadcastId}
  `

  const broadcastRows = await sql`SELECT sent_count, failed_count, total_recipients FROM email_broadcasts WHERE id = ${broadcastId}`
  const stats = broadcastRows[0]
  triggerBroadcastProgressEvent({
    broadcastId,
    status: "queued",
    sentCount: Number(stats?.sent_count || 0),
    failedCount: Number(stats?.failed_count || 0),
    totalRecipients: Number(stats?.total_recipients || 0),
  })

  return rows[0]
}

export async function processDueBroadcastJobs(options?: { jobLimit?: number; batchSize?: number }) {
  const jobs = await claimDueJobs(options?.jobLimit || 2)
  const batchSize = options?.batchSize || 100

  for (const job of jobs as Array<{ id: number; broadcast_id: number }>) {
    const broadcastRows = await sql`SELECT * FROM email_broadcasts WHERE id = ${job.broadcast_id}`
    const broadcast = broadcastRows[0] as EmailBroadcast | undefined

    if (!broadcast) {
      await sql`UPDATE email_broadcast_jobs SET status = 'failed', last_error = 'Broadcast missing', processed_at = NOW() WHERE id = ${job.id}`
      continue
    }

    if (broadcast.status === "sent") {
      await sql`UPDATE email_broadcast_jobs SET status = 'completed', processed_at = NOW(), locked_at = NULL, lock_token = NULL WHERE id = ${job.id}`
      continue
    }

    await syncRecipients(broadcast)

    await sql`
      UPDATE email_broadcasts
      SET status = 'sending', started_at = COALESCE(started_at, NOW()), last_error = NULL, updated_at = NOW()
      WHERE id = ${broadcast.id}
    `

    const tasks = await claimRecipientBatch(broadcast.id, batchSize)
    if (tasks.length === 0) {
      await finalizeIfCompleted(job.id, broadcast.id)
      continue
    }

    for (const task of tasks) {
      try {
        const rendered = renderBroadcastTemplate({
          templateKey: broadcast.template_key,
          props: (broadcast.template_props || {}) as BroadcastTemplateProps,
          context: {
            subject: broadcast.subject,
            preheader: broadcast.preheader,
            recipient: { email: task.recipient_email, name: task.contact_name },
          },
        })

        const delivery = await sendEmail({
          to: task.recipient_email,
          subject: broadcast.subject,
          html: rendered.html,
          text: rendered.text,
          campaign_id: broadcast.id,
          recipient_name: task.contact_name || undefined,
          headers: {
            "X-Idempotency-Key": `broadcast-${broadcast.id}-${task.recipient_email.toLowerCase()}`,
          },
        })

        await sql`
          UPDATE email_broadcast_recipients
          SET
            status = 'sent',
            sent_at = NOW(),
            delivery_message_id = ${delivery.message_id || null},
            error_message = NULL,
            locked_at = NULL,
            lock_token = NULL,
            updated_at = NOW()
          WHERE id = ${task.id} AND lock_token = ${task.lock_token}
        `
      } catch (error) {
        const isTerminal = task.attempts >= task.max_attempts
        const backoffMinutes = getBackoffMinutes(task.attempts)

        await sql.query(
          `
            UPDATE email_broadcast_recipients
            SET
              status = $1,
              error_message = $2,
              next_retry_at = CASE WHEN $3 THEN NULL ELSE NOW() + (($4::text || ' minutes')::interval) END,
              locked_at = NULL,
              lock_token = NULL,
              updated_at = NOW()
            WHERE id = $5 AND lock_token = $6
          `,
          [
            isTerminal ? "failed" : "pending",
            error instanceof Error ? error.message : "Failed to send",
            isTerminal,
            backoffMinutes,
            task.id,
            task.lock_token,
          ],
        )
      }

      await refreshBroadcastCounters(broadcast.id)
      const statsRows = await sql`SELECT sent_count, failed_count, total_recipients FROM email_broadcasts WHERE id = ${broadcast.id}`
      const stats = statsRows[0]
      triggerBroadcastProgressEvent({
        broadcastId: broadcast.id,
        status: "sending",
        sentCount: Number(stats?.sent_count || 0),
        failedCount: Number(stats?.failed_count || 0),
        totalRecipients: Number(stats?.total_recipients || 0),
      })
    }

    await finalizeIfCompleted(job.id, broadcast.id)
  }

  return { processedJobs: jobs.length }
}
