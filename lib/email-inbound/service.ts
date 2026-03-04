import { createHmac, timingSafeEqual } from "crypto"
import { sendEmail } from "@/lib/email"
import { queryMany, queryOne, sql } from "@/lib/db"

export type InboundProvider = "resend" | "sendgrid" | "ses" | "generic"

type ReplyActionStatus = "drafted" | "sent" | "skipped" | "failed"

export interface NormalizedInboundEmail {
  provider: InboundProvider
  providerMessageId: string
  providerThreadId: string | null
  fromEmail: string
  toEmail: string | null
  subject: string | null
  textBody: string | null
  htmlBody: string | null
  receivedAt: Date
  headers: Record<string, string>
  attachments: Array<{ name?: string; contentType?: string }>
  raw: Record<string, unknown>
}

interface ReplyPolicyConfig {
  strictSafeMode: boolean
  autoReplyEnabled: boolean
  confidenceThreshold: number
  allowCampaignIds: number[]
  denyCampaignIds: number[]
  allowTags: string[]
  denyTags: string[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function parseCsvNumbers(value: string | undefined): number[] {
  if (!value) return []
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item > 0)
}

function parseCsvStrings(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function getReplyPolicyConfig(): ReplyPolicyConfig {
  const threshold = Number.parseFloat(process.env.EMAIL_REPLY_CONFIDENCE_THRESHOLD || "0.75")
  return {
    strictSafeMode: (process.env.EMAIL_REPLY_STRICT_SAFE_MODE || "true").toLowerCase() === "true",
    autoReplyEnabled: (process.env.EMAIL_REPLY_AUTO_ENABLED || "false").toLowerCase() === "true",
    confidenceThreshold: Number.isFinite(threshold) ? threshold : 0.75,
    allowCampaignIds: parseCsvNumbers(process.env.EMAIL_REPLY_ALLOW_CAMPAIGN_IDS),
    denyCampaignIds: parseCsvNumbers(process.env.EMAIL_REPLY_DENY_CAMPAIGN_IDS),
    allowTags: parseCsvStrings(process.env.EMAIL_REPLY_ALLOW_TAGS),
    denyTags: parseCsvStrings(process.env.EMAIL_REPLY_DENY_TAGS),
  }
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function verifyHmac(secret: string, rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  return safeCompare(expected, signature.replace(/^sha256=/i, ""))
}

export function verifyInboundWebhookSignature(provider: InboundProvider, rawBody: string, headers: Headers) {
  const strict = process.env.EMAIL_WEBHOOK_STRICT_SIGNATURE === "true"
  if (provider === "ses") return { ok: true as const }

  if (provider === "resend") {
    const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET
    if (!secret) return strict ? { ok: false as const, reason: "Missing RESEND_INBOUND_WEBHOOK_SECRET" } : { ok: true as const }
    const signature = headers.get("resend-signature") || headers.get("x-resend-signature") || ""
    if (!signature) return { ok: false as const, reason: "Missing resend signature" }
    return verifyHmac(secret, rawBody, signature) ? { ok: true as const } : { ok: false as const, reason: "Invalid resend signature" }
  }

  if (provider === "sendgrid") {
    const secret = process.env.SENDGRID_INBOUND_WEBHOOK_SECRET || process.env.SENDGRID_WEBHOOK_SECRET
    if (!secret) return strict ? { ok: false as const, reason: "Missing SENDGRID_INBOUND_WEBHOOK_SECRET" } : { ok: true as const }
    const signature = headers.get("x-sendgrid-signature") || ""
    if (!signature) return { ok: false as const, reason: "Missing sendgrid signature" }
    return verifyHmac(secret, rawBody, signature) ? { ok: true as const } : { ok: false as const, reason: "Invalid sendgrid signature" }
  }

  const genericSecret = process.env.GENERIC_INBOUND_WEBHOOK_SECRET || process.env.GENERIC_EMAIL_WEBHOOK_SECRET
  if (!genericSecret) return strict ? { ok: false as const, reason: "Missing GENERIC_INBOUND_WEBHOOK_SECRET" } : { ok: true as const }

  const genericSignature = headers.get("x-webhook-signature") || ""
  if (!genericSignature) return { ok: false as const, reason: "Missing signature" }
  return verifyHmac(genericSecret, rawBody, genericSignature) ? { ok: true as const } : { ok: false as const, reason: "Invalid signature" }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeInboundPayload(provider: InboundProvider, payload: Record<string, unknown>): NormalizedInboundEmail {
  if (provider === "resend") {
    return {
      provider,
      providerMessageId: String(payload.email_id || payload.message_id || payload.id || ""),
      providerThreadId: String(payload.thread_id || payload.conversation_id || "") || null,
      fromEmail: normalizeEmail(String(payload.from || payload.sender || "")),
      toEmail: payload.to ? String(payload.to).toLowerCase() : null,
      subject: payload.subject ? String(payload.subject) : null,
      textBody: payload.text ? String(payload.text) : null,
      htmlBody: payload.html ? String(payload.html) : null,
      receivedAt: new Date(payload.created_at ? String(payload.created_at) : Date.now()),
      headers: asRecord(payload.headers) as Record<string, string>,
      attachments: Array.isArray(payload.attachments) ? (payload.attachments as Array<{ name?: string; contentType?: string }>) : [],
      raw: payload,
    }
  }

  const headers = asRecord(payload.headers) as Record<string, string>
  const envelope = asRecord(payload.envelope)
  const senderObj = asRecord(payload.from)

  return {
    provider,
    providerMessageId: String(payload.message_id || payload.smtp_id || payload.messageId || headers["message-id"] || ""),
    providerThreadId: String(payload.thread_id || payload.threadId || headers["in-reply-to"] || headers["In-Reply-To"] || "") || null,
    fromEmail: normalizeEmail(String(senderObj.email || payload.from || payload.sender || envelope.from || "")),
    toEmail: payload.to ? String(payload.to).toLowerCase() : null,
    subject: payload.subject ? String(payload.subject) : null,
    textBody: payload.text ? String(payload.text) : null,
    htmlBody: payload.html ? String(payload.html) : null,
    receivedAt: new Date(payload.timestamp ? String(payload.timestamp) : Date.now()),
    headers,
    attachments: Array.isArray(payload.attachments) ? (payload.attachments as Array<{ name?: string; contentType?: string }>) : [],
    raw: payload,
  }
}

function classifyInboundMessage(message: NormalizedInboundEmail) {
  const content = `${message.subject || ""}\n${message.textBody || ""}`.toLowerCase()

  if (/unsubscribe|stop email|remove me/.test(content)) {
    return { label: "unsubscribe_request", confidence: 0.97, suggestedReply: "We've processed your unsubscribe request." }
  }
  if (/refund|chargeback|fraud|scam|angry/.test(content)) {
    return { label: "customer_complaint", confidence: 0.82, suggestedReply: "Thanks for flagging this. A specialist will follow up shortly." }
  }
  if (/order|shipment|tracking|delivery|price|discount|product|feature/.test(content)) {
    return { label: "support_question", confidence: 0.78, suggestedReply: "Thanks for reaching out. Our team is reviewing your question now." }
  }

  return { label: "unclear", confidence: 0.55, suggestedReply: "Thank you for your message. A team member will reply soon." }
}

async function resolveMessageContext(message: NormalizedInboundEmail) {
  const contact = await queryOne<{ id: number; email: string }>(
    sql`SELECT id, email FROM email_contacts WHERE LOWER(email) = ${message.fromEmail} LIMIT 1`,
  )

  const inReplyTo = message.headers["In-Reply-To"] || message.headers["in-reply-to"] || message.providerThreadId || null
  const broadcast = inReplyTo
    ? await queryOne<{ broadcast_id: number | null; campaign_id: number | null }>(
        queryMany(
          `SELECT ebr.broadcast_id, ed.campaign_id
           FROM email_broadcast_recipients ebr
           LEFT JOIN email_deliveries ed ON ed.message_id = $1
           WHERE ebr.delivery_message_id = $1
           LIMIT 1`,
          [String(inReplyTo)],
        ),
      )
    : null

  return {
    contactId: contact?.id ?? null,
    contactEmail: contact?.email || message.fromEmail,
    broadcastId: broadcast?.broadcast_id ?? null,
    campaignId: broadcast?.campaign_id ?? null,
  }
}

async function upsertThread(input: {
  provider: InboundProvider
  providerThreadId: string | null
  subject: string | null
  contactId: number | null
  contactEmail: string
  broadcastId: number | null
  campaignId: number | null
}) {
  if (input.providerThreadId) {
    const existing = await queryOne<{ id: number }>(
      queryMany("SELECT id FROM email_reply_threads WHERE provider = $1 AND provider_thread_id = $2 LIMIT 1", [input.provider, input.providerThreadId]),
    )
    if (existing) return existing.id
  }

  const inserted = await sql<{ id: number }>`
    INSERT INTO email_reply_threads (provider, provider_thread_id, subject, contact_id, contact_email, broadcast_id, campaign_id)
    VALUES (${input.provider}, ${input.providerThreadId}, ${input.subject}, ${input.contactId}, ${input.contactEmail}, ${input.broadcastId}, ${input.campaignId})
    RETURNING id
  `
  return inserted[0].id
}

async function createReplyAction(payload: {
  threadId: number
  inboundMessageId: number
  status: ReplyActionStatus
  actionType: string
  confidence?: number
  requiresHumanReview?: boolean
  reason?: string
  draftSubject?: string
  draftBody?: string
  metadata?: Record<string, unknown>
}) {
  await sql`
    INSERT INTO email_reply_actions (
      thread_id, inbound_message_id, action_type, status, confidence, requires_human_review,
      reason, draft_subject, draft_body, actor_type, metadata
    ) VALUES (
      ${payload.threadId}, ${payload.inboundMessageId}, ${payload.actionType}, ${payload.status},
      ${payload.confidence ?? null}, ${Boolean(payload.requiresHumanReview)}, ${payload.reason || null},
      ${payload.draftSubject || null}, ${payload.draftBody || null}, 'system', ${JSON.stringify(payload.metadata || {})}
    )
  `
}

async function evaluatePolicy(context: { campaignId: number | null; contactId: number | null }) {
  const config = getReplyPolicyConfig()
  const tags = context.contactId
    ? await queryMany<{ tag: string }>("SELECT tag FROM email_contact_tags WHERE contact_id = $1", [context.contactId])
    : []
  const normalizedTags = tags.map((entry) => entry.tag.toLowerCase())

  if (config.strictSafeMode) return { allowed: false, reason: "strict_safe_mode_enabled", config }
  if (!config.autoReplyEnabled) return { allowed: false, reason: "auto_reply_disabled", config }
  if (context.campaignId && config.denyCampaignIds.includes(context.campaignId)) return { allowed: false, reason: "campaign_denied", config }
  if (normalizedTags.some((tag) => config.denyTags.includes(tag))) return { allowed: false, reason: "tag_denied", config }
  if (config.allowCampaignIds.length > 0 && (!context.campaignId || !config.allowCampaignIds.includes(context.campaignId))) {
    return { allowed: false, reason: "campaign_not_allowlisted", config }
  }
  if (config.allowTags.length > 0 && !normalizedTags.some((tag) => config.allowTags.includes(tag))) {
    return { allowed: false, reason: "tag_not_allowlisted", config }
  }
  return { allowed: true, reason: "policy_allowed", config }
}

export async function ingestInboundMessage(provider: InboundProvider, payload: Record<string, unknown>) {
  const normalized = normalizeInboundPayload(provider, payload)
  if (!normalized.providerMessageId || !normalized.fromEmail) return { accepted: false, reason: "missing_required_fields" }

  const existing = await queryMany<{ id: number }>(
    "SELECT id FROM email_inbound_messages WHERE provider = $1 AND provider_message_id = $2 LIMIT 1",
    [normalized.provider, normalized.providerMessageId],
  )
  if (existing.length > 0) return { accepted: true, duplicate: true, messageId: existing[0].id }

  const context = await resolveMessageContext(normalized)
  const threadId = await upsertThread({
    provider: normalized.provider,
    providerThreadId: normalized.providerThreadId,
    subject: normalized.subject,
    contactId: context.contactId,
    contactEmail: context.contactEmail,
    broadcastId: context.broadcastId,
    campaignId: context.campaignId,
  })

  const inserted = await sql<{ id: number }>`
    INSERT INTO email_inbound_messages (
      thread_id, provider, provider_message_id, provider_thread_id, from_email, to_email,
      subject, text_body, html_body, headers, attachments, normalized_payload, received_at
    ) VALUES (
      ${threadId}, ${normalized.provider}, ${normalized.providerMessageId}, ${normalized.providerThreadId},
      ${normalized.fromEmail}, ${normalized.toEmail}, ${normalized.subject}, ${normalized.textBody},
      ${normalized.htmlBody}, ${JSON.stringify(normalized.headers)}, ${JSON.stringify(normalized.attachments)},
      ${JSON.stringify(normalized.raw)}, ${normalized.receivedAt.toISOString()}
    )
    RETURNING id
  `

  const classification = classifyInboundMessage(normalized)
  const policy = await evaluatePolicy({ campaignId: context.campaignId, contactId: context.contactId })
  const requiresReview = !policy.allowed || classification.confidence < policy.config.confidenceThreshold

  await createReplyAction({
    threadId,
    inboundMessageId: inserted[0].id,
    status: "drafted",
    actionType: requiresReview ? "human_review" : "draft",
    confidence: classification.confidence,
    requiresHumanReview: requiresReview,
    reason: requiresReview ? (policy.allowed ? "low_confidence" : policy.reason) : "auto_draft_ready",
    draftSubject: normalized.subject ? `Re: ${normalized.subject}` : "Re: your message",
    draftBody: classification.suggestedReply,
    metadata: { classification: classification.label, policyReason: policy.reason, threshold: policy.config.confidenceThreshold },
  })

  return { accepted: true, duplicate: false, threadId, inboundMessageId: inserted[0].id, requiresReview }
}

export async function listReplyInbox(limit = 30, offset = 0) {
  return queryMany(
    `SELECT
      m.id, m.thread_id, m.from_email, m.subject, m.text_body, m.received_at,
      t.contact_email, t.broadcast_id, t.campaign_id,
      a.status as latest_status, a.requires_human_review, a.draft_subject, a.draft_body, a.confidence
    FROM email_inbound_messages m
    INNER JOIN email_reply_threads t ON t.id = m.thread_id
    LEFT JOIN LATERAL (
      SELECT * FROM email_reply_actions ra
      WHERE ra.thread_id = m.thread_id
      ORDER BY ra.created_at DESC
      LIMIT 1
    ) a ON true
    ORDER BY m.received_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
}

export async function listReplyActionAudit(threadId: number) {
  return queryMany(
    `SELECT id, action_type, status, reason, confidence, requires_human_review, draft_subject, draft_body, edited_body, final_recipient, actor_type, actor_id, created_at
     FROM email_reply_actions WHERE thread_id = $1 ORDER BY created_at DESC`,
    [threadId],
  )
}

export async function handleReplyAction(input: {
  inboundMessageId: number
  action: "approve_send" | "save_edit" | "skip"
  editedBody?: string
  adminUserId?: number
}) {
  const message = await queryOne<{ id: number; thread_id: number; from_email: string; subject: string | null }>(
    queryMany("SELECT id, thread_id, from_email, subject FROM email_inbound_messages WHERE id = $1", [input.inboundMessageId]),
  )
  if (!message) throw new Error("Inbound message not found")

  const latest = await queryOne<{ draft_subject: string | null; draft_body: string | null }>(
    queryMany("SELECT draft_subject, draft_body FROM email_reply_actions WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1", [message.thread_id]),
  )

  if (input.action === "skip") {
    await sql`
      INSERT INTO email_reply_actions (thread_id, inbound_message_id, action_type, status, reason, actor_type, actor_id)
      VALUES (${message.thread_id}, ${message.id}, 'skip', 'skipped', 'manually_skipped', 'admin', ${input.adminUserId || null})
    `
    return { status: "skipped" as const }
  }

  if (input.action === "save_edit") {
    await sql`
      INSERT INTO email_reply_actions (thread_id, inbound_message_id, action_type, status, draft_subject, draft_body, edited_body, actor_type, actor_id)
      VALUES (${message.thread_id}, ${message.id}, 'edit', 'drafted', ${latest?.draft_subject || `Re: ${message.subject || "your message"}`}, ${latest?.draft_body || ""}, ${input.editedBody || ""}, 'admin', ${input.adminUserId || null})
    `
    return { status: "drafted" as const }
  }

  const body = input.editedBody || latest?.draft_body || ""
  try {
    const sent = await sendEmail({
      to: message.from_email,
      subject: latest?.draft_subject || `Re: ${message.subject || "your message"}`,
      html: `<p>${body.replace(/\n/g, "<br />")}</p>`,
      text: body,
    })

    await sql`
      INSERT INTO email_reply_actions (
        thread_id, inbound_message_id, action_type, status, draft_subject, draft_body,
        edited_body, final_recipient, sent_message_id, actor_type, actor_id
      ) VALUES (
        ${message.thread_id}, ${message.id}, 'approve_send', 'sent',
        ${latest?.draft_subject || `Re: ${message.subject || "your message"}`}, ${latest?.draft_body || ""},
        ${input.editedBody || null}, ${message.from_email}, ${sent.message_id || null}, 'admin', ${input.adminUserId || null}
      )
    `

    return { status: "sent" as const }
  } catch (error) {
    await sql`
      INSERT INTO email_reply_actions (thread_id, inbound_message_id, action_type, status, reason, actor_type, actor_id)
      VALUES (${message.thread_id}, ${message.id}, 'approve_send', 'failed', ${error instanceof Error ? error.message.slice(0, 500) : 'send_failed'}, 'admin', ${input.adminUserId || null})
    `
    throw error
  }
}
