import { neon } from "@neondatabase/serverless"
import { normalizePagination, SafeWhereBuilder } from "@/lib/email-filter-utils"

const sql = neon(process.env.DATABASE_URL!)

export type EmailContactStatus = "subscribed" | "unsubscribed" | "bounced" | "suppressed"

export interface EmailContact {
  id: number
  email: string
  name: string | null
  status: EmailContactStatus
  metadata: Record<string, unknown>
  source: string | null
  created_at: Date
  updated_at: Date
  tags: string[]
}

export interface EmailContactImportJob {
  id: number
  file_name: string | null
  status: "processing" | "completed" | "failed"
  total_rows: number
  created_count: number
  updated_count: number
  duplicate_count: number
  invalid_count: number
  summary: Record<string, unknown>
  created_by: number | null
  created_at: Date
  updated_at: Date
}

export interface EmailContactImportSummary {
  total_rows: number
  created_count: number
  updated_count: number
  duplicate_count: number
  invalid_count: number
  errors: string[]
}

const VALID_STATUSES: EmailContactStatus[] = ["subscribed", "unsubscribed", "bounced", "suppressed"]

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function sanitizeTags(tags: string[] | undefined): string[] {
  if (!tags) return []
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))]
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

export class EmailContactManager {
  static isValidStatus(status: string): status is EmailContactStatus {
    return VALID_STATUSES.includes(status as EmailContactStatus)
  }

  static async getContacts(filters: {
    status?: string
    tags?: string[]
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ contacts: EmailContact[]; total: number }> {
    const { limit, offset } = normalizePagination(filters.limit, filters.offset, {
      defaultLimit: 20,
      maxLimit: 200,
    })

    const safeTags = sanitizeTags(filters.tags)
    const whereBuilder = new SafeWhereBuilder()
      .addEquals("c.status", filters.status)
      .addAnyIlikeContains(["c.email", "c.name"], filters.search)

    const builtBeforeTags = whereBuilder.build()
    if (safeTags.length > 0) {
      whereBuilder.addRaw(`EXISTS (
        SELECT 1 FROM email_contact_tags ect
        WHERE ect.contact_id = c.id
          AND ect.tag = ANY($${builtBeforeTags.params.length + 1})
      )`)
    }

    const built = whereBuilder.build()
    const params = safeTags.length > 0 ? [...built.params, safeTags] : built.params

    const countResult = await sql.query(`SELECT COUNT(*)::int AS total FROM email_contacts c ${built.whereClause}`, params)
    const total = Number(countResult[0]?.total ?? 0)

    const rows = await sql.query(
      `SELECT
         c.*,
         COALESCE(array_remove(array_agg(DISTINCT ect.tag), NULL), '{}') AS tags
       FROM email_contacts c
       LEFT JOIN email_contact_tags ect ON ect.contact_id = c.id
       ${built.whereClause}
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    )

    return {
      contacts: rows.map((row) => ({ ...row, tags: parseTags(row.tags) })) as EmailContact[],
      total,
    }
  }

  static async createContact(data: {
    email: string
    name?: string
    status?: EmailContactStatus
    metadata?: Record<string, unknown>
    source?: string
    tags?: string[]
  }): Promise<EmailContact | null> {
    const safeEmail = normalizeEmail(data.email)
    const safeTags = sanitizeTags(data.tags)

    const result = await sql`
      INSERT INTO email_contacts (email, name, status, metadata, source)
      VALUES (
        ${safeEmail},
        ${data.name?.trim() || null},
        ${data.status || "subscribed"},
        ${JSON.stringify(data.metadata || {})},
        ${data.source || "manual"}
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      return null
    }

    const contactId = result[0].id
    if (safeTags.length > 0) {
      await Promise.all(
        safeTags.map((tag) =>
          sql`
            INSERT INTO email_contact_tags (contact_id, tag)
            VALUES (${contactId}, ${tag})
            ON CONFLICT (contact_id, tag) DO NOTHING
          `,
        ),
      )
    }

    return this.getContact(contactId)
  }

  static async getContact(id: number): Promise<EmailContact | null> {
    const rows = await sql`
      SELECT
        c.*,
        COALESCE(array_remove(array_agg(DISTINCT ect.tag), NULL), '{}') AS tags
      FROM email_contacts c
      LEFT JOIN email_contact_tags ect ON ect.contact_id = c.id
      WHERE c.id = ${id}
      GROUP BY c.id
    `

    if (rows.length === 0) return null
    return { ...(rows[0] as EmailContact), tags: parseTags(rows[0].tags) }
  }

  static async updateContact(
    id: number,
    data: Partial<{
      email: string
      name: string | null
      status: EmailContactStatus
      metadata: Record<string, unknown>
      source: string
      tags: string[]
    }>,
  ): Promise<EmailContact | null> {
    const current = await this.getContact(id)
    if (!current) return null

    const nextEmail = data.email ? normalizeEmail(data.email) : current.email

    await sql`
      UPDATE email_contacts
      SET
        email = ${nextEmail},
        name = ${data.name === undefined ? current.name : data.name?.trim() || null},
        status = ${data.status || current.status},
        metadata = ${JSON.stringify(data.metadata ?? current.metadata ?? {})},
        source = ${data.source ?? current.source},
        updated_at = NOW()
      WHERE id = ${id}
    `

    if (data.tags) {
      const safeTags = sanitizeTags(data.tags)
      await sql`DELETE FROM email_contact_tags WHERE contact_id = ${id}`
      if (safeTags.length > 0) {
        await Promise.all(
          safeTags.map((tag) =>
            sql`
              INSERT INTO email_contact_tags (contact_id, tag)
              VALUES (${id}, ${tag})
              ON CONFLICT (contact_id, tag) DO NOTHING
            `,
          ),
        )
      }
    }

    return this.getContact(id)
  }

  static async deleteContact(id: number): Promise<boolean> {
    const result = await sql`DELETE FROM email_contacts WHERE id = ${id} RETURNING id`
    return result.length > 0
  }

  static async createImportJob(data: {
    file_name?: string
    created_by?: number
    total_rows?: number
  }): Promise<EmailContactImportJob> {
    const result = await sql`
      INSERT INTO email_contact_import_jobs (file_name, created_by, total_rows, status)
      VALUES (${data.file_name || null}, ${data.created_by || null}, ${data.total_rows || 0}, 'processing')
      RETURNING *
    `
    return result[0] as EmailContactImportJob
  }

  static async finalizeImportJob(
    id: number,
    data: {
      status: "completed" | "failed"
      total_rows: number
      created_count: number
      updated_count: number
      duplicate_count: number
      invalid_count: number
      summary: Record<string, unknown>
    },
  ): Promise<EmailContactImportJob | null> {
    const result = await sql`
      UPDATE email_contact_import_jobs
      SET
        status = ${data.status},
        total_rows = ${data.total_rows},
        created_count = ${data.created_count},
        updated_count = ${data.updated_count},
        duplicate_count = ${data.duplicate_count},
        invalid_count = ${data.invalid_count},
        summary = ${JSON.stringify(data.summary)},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return (result[0] as EmailContactImportJob) || null
  }
}
