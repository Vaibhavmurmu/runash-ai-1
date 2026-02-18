import nodemailer from "nodemailer"

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
}

interface EmailProvider {
  send(input: SendEmailInput): Promise<unknown>
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
  async send(input: SendEmailInput) {
    const resendApiKey = process.env.RESEND_API_KEY
    const from = input.from ?? process.env.EMAIL_FROM ?? process.env.SMTP_FROM

    if (!resendApiKey || !from) {
      throw new Error("RESEND_API_KEY and EMAIL_FROM are required for EMAIL_PROVIDER=resend")
    }

    const to = Array.isArray(input.to) ? input.to : [input.to]
    const attachments = input.attachments?.map((attachment) => {
      const content =
        typeof attachment.content === "string"
          ? Buffer.from(attachment.content).toString("base64")
          : attachment.content.toString("base64")

      return {
        name: attachment.filename,
        content,
      }
    })

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: input.headers,
        attachments,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Resend email send failed (${response.status}): ${errorBody}`)
    }

    return response.json()
  }
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS))
}

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.SMTP_FROM))
}

function resolveProviderType() {
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
