import nodemailer from "nodemailer"

export interface EmailSendRequest {
  to: string | string[]
  from?: string
  subject: string
  html: string
  text?: string
  headers?: Record<string, string>
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
}

export interface EmailProviderClient {
  name: string
  send(input: EmailSendRequest): Promise<unknown>
}

class ResendProviderClient implements EmailProviderClient {
  name = "resend"

  async send(input: EmailSendRequest) {
    const resendApiKey = process.env.RESEND_API_KEY
    const from = input.from ?? process.env.EMAIL_FROM ?? process.env.SMTP_FROM

    if (!resendApiKey || !from) {
      throw new Error("RESEND_API_KEY and EMAIL_FROM are required for Resend email provider")
    }

    const to = Array.isArray(input.to) ? input.to : [input.to]
    const attachments = input.attachments?.map((attachment) => {
      const content = typeof attachment.content === "string" ? Buffer.from(attachment.content).toString("base64") : attachment.content.toString("base64")
      return { name: attachment.filename, content }
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
      throw new Error(`Resend email send failed (${response.status}): ${await response.text()}`)
    }

    return response.json()
  }
}

class SmtpProviderClient implements EmailProviderClient {
  name = "smtp"

  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true" || Number.parseInt(process.env.SMTP_PORT ?? "587", 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS,
    },
  })

  async send(input: EmailSendRequest) {
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

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.SMTP_FROM))
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS))
}

export function resolveEmailProviderClient(preferredProvider?: "resend" | "smtp") {
  const order = preferredProvider ? [preferredProvider, preferredProvider === "resend" ? "smtp" : "resend"] : ["resend", "smtp"]

  for (const provider of order) {
    if (provider === "resend" && hasResendConfig()) {
      return new ResendProviderClient()
    }

    if (provider === "smtp" && hasSmtpConfig()) {
      return new SmtpProviderClient()
    }
  }

  throw new Error("No email provider configured. Configure Resend or SMTP credentials.")
}
