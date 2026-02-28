import nodemailer from "nodemailer"
import { Resend } from "resend"

type Recipient = string | string[]

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface SendEmailInput {
  to: Recipient
  subject: string
  html: string
  text?: string
  headers?: Record<string, string>
  attachments?: EmailAttachment[]
  from?: string
  replyTo?: Recipient
  scheduledAt?: string
  tags?: Array<{ name: string; value: string }>
  idempotencyKey?: string
}

interface EmailProvider {
  send(input: SendEmailInput): Promise<unknown>
}

export type EmailProviderType = "smtp" | "resend"

export interface EmailProviderDiagnostics {
  provider: EmailProviderType
  configuredProvider?: string
  fallbackActive: boolean
  smtpConfigured: boolean
  resendConfigured: boolean
}

export interface EmailProviderHealthCheckResult {
  ok: boolean
  provider: EmailProviderType
  checkedAt: string
  diagnostics: EmailProviderDiagnostics
  reason?: string
}

class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter

  constructor() {
    const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? "587", 10)
    const smtpPassword = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPassword,
      },
    })
  }

  async send(input: SendEmailInput) {
    const from = input.from ?? process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? "noreply@runash.in"

    return this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: input.headers,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    })
  }
}

class ResendEmailProvider implements EmailProvider {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  async send(input: SendEmailInput) {
    const from = input.from ?? process.env.RESEND_VERIFIED_FROM ?? process.env.EMAIL_FROM ?? process.env.SMTP_FROM

    if (!process.env.RESEND_API_KEY || !from) {
      throw new Error("RESEND_API_KEY and RESEND_VERIFIED_FROM (or EMAIL_FROM) are required for EMAIL_PROVIDER=resend")
    }

    const to = Array.isArray(input.to) ? input.to : [input.to]
    const replyTo = input.replyTo ? (Array.isArray(input.replyTo) ? input.replyTo : [input.replyTo]) : undefined
    const attachments = input.attachments?.map((attachment) => {
      const content =
        typeof attachment.content === "string"
          ? Buffer.from(attachment.content).toString("base64")
          : attachment.content.toString("base64")

      return {
        filename: attachment.filename,
        content,
        contentType: attachment.contentType,
      }
    })

    const sendEmail = async () => {
      const { data, error } = await this.resend.emails.send({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: input.headers,
        attachments,
        replyTo,
        scheduledAt: input.scheduledAt,
        tags: input.tags,
        idempotencyKey: input.idempotencyKey,
      })

      if (error) {
        throw error
      }

      return data
    }

    return sendWithSafeRetry(sendEmail)
  }
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_EMAIL_SEND_ATTEMPTS = 4

function getErrorStatusCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return undefined
  }

  const statusCode = Reflect.get(error, "statusCode")
  if (typeof statusCode === "number") {
    return statusCode
  }

  const status = Reflect.get(error, "status")
  if (typeof status === "number") {
    return status
  }

  return undefined
}

function isRetryableEmailError(error: unknown) {
  const statusCode = getErrorStatusCode(error)
  return statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithSafeRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0

  while (attempt < MAX_EMAIL_SEND_ATTEMPTS) {
    try {
      return await operation()
    } catch (error) {
      attempt += 1

      if (!isRetryableEmailError(error) || attempt >= MAX_EMAIL_SEND_ATTEMPTS) {
        throw error
      }

      const baseDelayMs = 300 * 2 ** (attempt - 1)
      const jitterMs = Math.floor(Math.random() * 150)
      await sleep(baseDelayMs + jitterMs)
    }
  }

  throw new Error("Email send retries exhausted")
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS))
}

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.RESEND_VERIFIED_FROM || process.env.EMAIL_FROM || process.env.SMTP_FROM))
}

function resolveProviderType(): EmailProviderType {
  const configuredProvider = process.env.EMAIL_PROVIDER?.toLowerCase()

  if (configuredProvider === "smtp") {
    if (hasSmtpConfig()) {
      return "smtp" as const
    }
    if (hasResendConfig()) {
      console.warn("EMAIL_PROVIDER=smtp configured without SMTP credentials. Falling back to Resend provider.")
      return "resend" as const
    }
    throw new Error("EMAIL_PROVIDER=smtp selected but SMTP credentials are incomplete.")
  }

  if (configuredProvider === "resend") {
    if (hasResendConfig()) {
      return "resend" as const
    }
    if (hasSmtpConfig()) {
      console.warn("EMAIL_PROVIDER=resend configured without Resend credentials. Falling back to SMTP provider.")
      return "smtp" as const
    }
    throw new Error("EMAIL_PROVIDER=resend selected but Resend credentials are incomplete.")
  }

  if (configuredProvider && configuredProvider !== "smtp" && configuredProvider !== "resend") {
    console.warn(`Unknown EMAIL_PROVIDER value \"${configuredProvider}\". Falling back to automatic provider selection.`)
  }

  if (hasSmtpConfig()) {
    return "smtp" as const
  }

  if (hasResendConfig()) {
    return "resend" as const
  }

  throw new Error("No email provider configured. Set SMTP_* (with SMTP_PASSWORD) or RESEND_API_KEY + EMAIL_FROM.")
}

export function getEmailProviderDiagnostics(): EmailProviderDiagnostics {
  const configuredProvider = process.env.EMAIL_PROVIDER?.toLowerCase()
  const smtpConfigured = hasSmtpConfig()
  const resendConfigured = hasResendConfig()
  const provider = resolveProviderType()

  return {
    provider,
    configuredProvider,
    fallbackActive: Boolean(configuredProvider && configuredProvider !== provider),
    smtpConfigured,
    resendConfigured,
  }
}

export async function runEmailProviderHealthCheck(): Promise<EmailProviderHealthCheckResult> {
  const diagnostics = getEmailProviderDiagnostics()

  try {
    if (diagnostics.provider === "smtp") {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
        secure: process.env.SMTP_SECURE === "true" || Number.parseInt(process.env.SMTP_PORT ?? "587", 10) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS,
        },
      })

      await transporter.verify()
      return {
        ok: true,
        provider: diagnostics.provider,
        checkedAt: new Date().toISOString(),
        diagnostics,
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return {
        ok: false,
        provider: diagnostics.provider,
        checkedAt: new Date().toISOString(),
        diagnostics,
        reason: "RESEND_API_KEY is missing",
      }
    }

    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
      },
    })

    if (!response.ok) {
      return {
        ok: false,
        provider: diagnostics.provider,
        checkedAt: new Date().toISOString(),
        diagnostics,
        reason: `Resend health check failed with status ${response.status}`,
      }
    }

    return {
      ok: true,
      provider: diagnostics.provider,
      checkedAt: new Date().toISOString(),
      diagnostics,
    }
  } catch (error) {
    return {
      ok: false,
      provider: diagnostics.provider,
      checkedAt: new Date().toISOString(),
      diagnostics,
      reason: error instanceof Error ? error.message : "Email provider health check failed",
    }
  }
}

let cachedProvider: EmailProvider | undefined

function getEmailProvider() {
  if (!cachedProvider) {
    const providerType = resolveProviderType()
    cachedProvider = providerType === "smtp" ? new SmtpEmailProvider() : new ResendEmailProvider()
  }

  return cachedProvider
}

export async function sendWithEmailProvider(input: SendEmailInput) {
  return getEmailProvider().send(input)
}
