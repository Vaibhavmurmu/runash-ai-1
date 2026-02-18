import { neon } from "@neondatabase/serverless"
import { normalizePagination } from "@/lib/email-filter-utils"
import { EmailContactManager } from "@/lib/email-contacts"
import { sendEmail } from "@/lib/email"
import { listBroadcastTemplates, renderBroadcastTemplate, type BroadcastTemplateProps } from "@/lib/email-broadcast-templates"

const sql = neon(process.env.DATABASE_URL!)

export type EmailBroadcastStatus = "draft" | "scheduled" | "sending" | "sent"

export interface EmailBroadcast {
  id: number
  name: string
  subject: string
  preheader: string | null
  template_key: string
  template_props: BroadcastTemplateProps
  audience_filter: Record<string, unknown>
  status: EmailBroadcastStatus
  scheduled_at: Date | null
  started_at: Date | null
  sent_at: Date | null
  total_recipients: number
  sent_count: number
  failed_count: number
  last_error: string | null
  created_by: number | null
  created_at: Date
  updated_at: Date
  preview_html?: string
  preview_text?: string
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value === "object") return value as T
  try {
    return JSON.parse(String(value)) as T
  } catch {
    return fallback
  }
}

function withPreview(row: EmailBroadcast): EmailBroadcast {
  try {
    const rendered = renderBroadcastTemplate({
      templateKey: row.template_key,
      props: row.template_props || {},
      context: {
        subject: row.subject,
        preheader: row.preheader,
      },
    })

    return {
      ...row,
      preview_html: rendered.html,
      preview_text: rendered.text,
    }
  } catch {
    return row
  }
}

export class EmailBroadcastManager {
  static listTemplates() {
    return listBroadcastTemplates()
  }

  static async getBroadcasts(filters: { limit?: number; offset?: number; status?: string; search?: string }) {
    const { limit, offset } = normalizePagination(filters.limit, filters.offset, { defaultLimit: 20, maxLimit: 200 })

    const values: Array<string | number> = []
    const where: string[] = []

    if (filters.status) {
      values.push(filters.status)
      where.push(`status = $${values.length}`)
    }

    if (filters.search) {
      values.push(`%${filters.search}%`)
      where.push(`(name ILIKE $${values.length} OR subject ILIKE $${values.length})`)
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""

    const countRows = await sql.query(`SELECT COUNT(*)::int AS total FROM email_broadcasts ${whereClause}`, values)
    const total = Number(countRows[0]?.total || 0)

    const rows = await sql.query(
      `SELECT * FROM email_broadcasts ${whereClause} ORDER BY updated_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    )

    const broadcasts = rows.map((row) =>
      withPreview({
        ...(row as EmailBroadcast),
        template_props: parseJsonField<BroadcastTemplateProps>(row.template_props, {}),
        audience_filter: parseJsonField<Record<string, unknown>>(row.audience_filter, { status: "subscribed" }),
      }),
    )

    return { broadcasts, total, limit, offset }
  }

  static async getBroadcast(id: number): Promise<EmailBroadcast | null> {
    const rows = await sql`SELECT * FROM email_broadcasts WHERE id = ${id}`
    if (rows.length === 0) return null

    const broadcast = {
      ...(rows[0] as EmailBroadcast),
      template_props: parseJsonField<BroadcastTemplateProps>(rows[0].template_props, {}),
      audience_filter: parseJsonField<Record<string, unknown>>(rows[0].audience_filter, { status: "subscribed" }),
    }

    return withPreview(broadcast)
  }

  static async createBroadcast(input: {
    name: string
    subject: string
    preheader?: string
    template_key: string
    template_props?: BroadcastTemplateProps
    audience_filter?: Record<string, unknown>
    scheduled_at?: string | null
    created_by?: number
  }): Promise<EmailBroadcast> {
    const result = await sql`
      INSERT INTO email_broadcasts (
        name, subject, preheader, template_key, template_props, audience_filter, status, scheduled_at, created_by
      )
      VALUES (
        ${input.name.trim()},
        ${input.subject.trim()},
        ${input.preheader?.trim() || null},
        ${input.template_key},
        ${JSON.stringify(input.template_props || {})},
        ${JSON.stringify(input.audience_filter || { status: "subscribed" })},
        ${input.scheduled_at ? "scheduled" : "draft"},
        ${input.scheduled_at || null},
        ${input.created_by || null}
      )
      RETURNING *
    `

    return withPreview({
      ...(result[0] as EmailBroadcast),
      template_props: parseJsonField<BroadcastTemplateProps>(result[0].template_props, {}),
      audience_filter: parseJsonField<Record<string, unknown>>(result[0].audience_filter, { status: "subscribed" }),
    })
  }

  static async updateBroadcast(
    id: number,
    input: Partial<{
      name: string
      subject: string
      preheader: string
      template_key: string
      template_props: BroadcastTemplateProps
      audience_filter: Record<string, unknown>
      scheduled_at: string | null
      status: EmailBroadcastStatus
    }>,
  ): Promise<EmailBroadcast | null> {
    const existing = await this.getBroadcast(id)
    if (!existing) return null

    const nextScheduledAt = input.scheduled_at === undefined ? existing.scheduled_at : input.scheduled_at

    await sql`
      UPDATE email_broadcasts
      SET
        name = ${input.name?.trim() || existing.name},
        subject = ${input.subject?.trim() || existing.subject},
        preheader = ${input.preheader === undefined ? existing.preheader : input.preheader?.trim() || null},
        template_key = ${input.template_key || existing.template_key},
        template_props = ${JSON.stringify(input.template_props ?? existing.template_props ?? {})},
        audience_filter = ${JSON.stringify(input.audience_filter ?? existing.audience_filter ?? { status: "subscribed" })},
        scheduled_at = ${nextScheduledAt || null},
        status = ${input.status || (nextScheduledAt ? "scheduled" : existing.status)},
        updated_at = NOW()
      WHERE id = ${id}
    `

    return this.getBroadcast(id)
  }

  static async sendTest(id: number, recipientEmail: string): Promise<{ success: boolean; message: string }> {
    const broadcast = await this.getBroadcast(id)
    if (!broadcast) {
      throw new Error("Broadcast not found")
    }

    const rendered = renderBroadcastTemplate({
      templateKey: broadcast.template_key,
      props: broadcast.template_props || {},
      context: {
        subject: broadcast.subject,
        preheader: broadcast.preheader,
        recipient: { email: recipientEmail },
      },
    })

    await sendEmail({
      to: recipientEmail,
      subject: `[Test] ${broadcast.subject}`,
      html: rendered.html,
      text: rendered.text,
      track_delivery: true,
    })

    return { success: true, message: "Test email queued" }
  }

  static async sendBroadcast(id: number): Promise<{ sent: number; failed: number; total: number }> {
    const broadcast = await this.getBroadcast(id)
    if (!broadcast) throw new Error("Broadcast not found")
    if (broadcast.status === "sent") throw new Error("Broadcast already sent")

    const filterStatus = String((broadcast.audience_filter?.status as string) || "subscribed")
    const contacts = await EmailContactManager.getContacts({
      status: filterStatus,
      limit: 1000,
      offset: 0,
    })

    await sql`
      UPDATE email_broadcasts
      SET status = 'sending', started_at = NOW(), total_recipients = ${contacts.total}, sent_count = 0, failed_count = 0, last_error = NULL, updated_at = NOW()
      WHERE id = ${id}
    `

    if (contacts.contacts.length > 0) {
      await Promise.all(
        contacts.contacts.map((contact) =>
          sql`
            INSERT INTO email_broadcast_recipients (broadcast_id, contact_id, recipient_email, status)
            VALUES (${id}, ${contact.id}, ${contact.email}, 'pending')
            ON CONFLICT (broadcast_id, recipient_email) DO NOTHING
          `,
        ),
      )
    }

    let sent = 0
    let failed = 0

    for (const contact of contacts.contacts) {
      try {
        const rendered = renderBroadcastTemplate({
          templateKey: broadcast.template_key,
          props: broadcast.template_props || {},
          context: {
            subject: broadcast.subject,
            preheader: broadcast.preheader,
            recipient: { email: contact.email, name: contact.name },
          },
        })

        const delivery = await sendEmail({
          to: contact.email,
          subject: broadcast.subject,
          html: rendered.html,
          text: rendered.text,
          campaign_id: broadcast.id,
          recipient_name: contact.name || undefined,
        })

        await sql`
          UPDATE email_broadcast_recipients
          SET status = 'sent', sent_at = NOW(), delivery_message_id = ${delivery.message_id || null}, updated_at = NOW(), error_message = NULL
          WHERE broadcast_id = ${id} AND recipient_email = ${contact.email}
        `

        sent += 1
      } catch (error) {
        failed += 1
        await sql`
          UPDATE email_broadcast_recipients
          SET status = 'failed', error_message = ${error instanceof Error ? error.message : "Failed to send"}, updated_at = NOW()
          WHERE broadcast_id = ${id} AND recipient_email = ${contact.email}
        `
      }
    }

    await sql`
      UPDATE email_broadcasts
      SET
        status = 'sent',
        sent_at = NOW(),
        sent_count = ${sent},
        failed_count = ${failed},
        last_error = ${failed > 0 ? "Some recipients failed during send" : null},
        updated_at = NOW()
      WHERE id = ${id}
    `

    return { sent, failed, total: contacts.total }
  }
}
