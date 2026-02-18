import { EmailDeliveryTracker } from "./email-delivery"
import { EmailBounceHandler } from "./email-bounce-handler"
import { triggerDeliveryStatusEvent } from "./email-realtime"
import { type EmailAttachment, sendWithEmailProvider } from "./email-provider"

export interface EmailSafetyPolicyPayload {
  error: "EMAIL_SAFETY_BLOCKED"
  message: string
  policy: {
    safeMode: boolean
    dryRun: boolean
    recipient: string
    allowlistedRecipients: string[]
    sinkRecipient?: string
  }
}

export class EmailSafetyPolicyError extends Error {
  readonly statusCode = 403
  readonly payload: EmailSafetyPolicyPayload

  constructor(payload: EmailSafetyPolicyPayload) {
    super(payload.message)
    this.name = "EmailSafetyPolicyError"
    this.payload = payload
  }
}

function parseBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

function parseRecipientList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((recipient) => recipient.trim().toLowerCase())
    .filter(Boolean)
}

export function getEmailSafetyConfig() {
  const safeMode = parseBooleanEnv(process.env.EMAIL_SAFE_MODE, false)
  const dryRun = parseBooleanEnv(process.env.EMAIL_DRY_RUN, false)
  const allowlistedRecipients = parseRecipientList(process.env.EMAIL_TEST_RECIPIENTS)
  const sinkRecipient = process.env.EMAIL_SAFE_SINK_RECIPIENT?.trim().toLowerCase() || undefined

  return {
    safeMode,
    dryRun,
    allowlistedRecipients,
    sinkRecipient,
  }
}

export function applyEmailSafetyPolicy(recipientInput: string | string[]) {
  const config = getEmailSafetyConfig()
  const recipients = (Array.isArray(recipientInput) ? recipientInput : [recipientInput]).map((recipient) => recipient.trim())

  if (!config.safeMode) {
    return {
      recipients,
      rewritten: false,
      config,
    }
  }

  const unauthorizedRecipients = recipients.filter(
    (recipient) => !config.allowlistedRecipients.includes(recipient.toLowerCase()),
  )

  if (unauthorizedRecipients.length > 0) {
    if (config.sinkRecipient) {
      return {
        recipients: [config.sinkRecipient],
        rewritten: true,
        config,
      }
    }

    throw new EmailSafetyPolicyError({
      error: "EMAIL_SAFETY_BLOCKED",
      message: "Email blocked by delivery safety policy",
      policy: {
        safeMode: config.safeMode,
        dryRun: config.dryRun,
        recipient: unauthorizedRecipients.join(", "),
        allowlistedRecipients: config.allowlistedRecipients,
        sinkRecipient: config.sinkRecipient,
      },
    })
  }

  return {
    recipients,
    rewritten: false,
    config,
  }
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  headers?: Record<string, string>
  attachments?: EmailAttachment[]
  template_id?: number
  campaign_id?: number
  user_id?: number
  recipient_name?: string
  track_delivery?: boolean
}) {
  const safeDelivery = applyEmailSafetyPolicy(options.to)
  const targetRecipient = safeDelivery.recipients[0] ?? options.to

  const validation = await EmailBounceHandler.validateEmailForSending(targetRecipient)
  if (!validation.canSend) {
    throw new Error(`Cannot send email: ${validation.reason} (${validation.suppressionType})`)
  }

  let message_id: string | undefined
  let delivery_id: number | undefined

  if (options.track_delivery !== false) {
    try {
      const tracking = await EmailDeliveryTracker.createDelivery({
        recipient_email: targetRecipient,
        recipient_name: options.recipient_name,
        user_id: options.user_id,
        subject: options.subject,
        template_id: options.template_id,
        campaign_id: options.campaign_id,
      })

      delivery_id = tracking.delivery_id
      message_id = tracking.message_id
    } catch (error) {
      console.error("Error creating delivery tracking:", error)
    }
  }

  let html = options.html
  if (message_id && options.track_delivery !== false) {
    html = EmailDeliveryTracker.addTrackingToEmail(html, message_id)

    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?email=${encodeURIComponent(targetRecipient)}`
    const unsubscribeFooter = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
        <p>
          If you no longer wish to receive these emails, you can 
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.
        </p>
      </div>
    `

    if (html.includes("</body>")) {
      html = html.replace("</body>", `${unsubscribeFooter}</body>`)
    } else {
      html += unsubscribeFooter
    }
  }

  const headers = {
    ...(options.headers ?? {}),
    ...(message_id
      ? {
          "X-Message-ID": message_id,
          "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?email=${encodeURIComponent(targetRecipient)}>`,
        }
      : {}),
  }

  try {
    if (safeDelivery.config.dryRun) {
      if (message_id) {
        await EmailDeliveryTracker.updateDeliveryStatus(message_id, "pending", {
          tracking_data: {
            dry_run: true,
            simulated: true,
            safe_mode: safeDelivery.config.safeMode,
            rewritten_recipient: safeDelivery.rewritten ? targetRecipient : undefined,
            original_recipient: options.to,
          },
        })

        triggerDeliveryStatusEvent(message_id, targetRecipient, "pending", {
          simulated: true,
          dry_run: true,
        })
      }

      return {
        success: true,
        simulated: true,
        message_id,
        delivery_id,
      }
    }

    const providerResult = await sendWithEmailProvider({
      from: options.from,
      to: targetRecipient,
      subject: options.subject,
      html,
      text: options.text,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      attachments: options.attachments,
    })

    if (message_id) {
      await EmailDeliveryTracker.updateDeliveryStatus(message_id, "sent", {
        tracking_data: { provider_response: providerResult },
      })

      triggerDeliveryStatusEvent(message_id, targetRecipient, "sent", {
        provider_response: providerResult,
      })
    }

    return { success: true, message_id, delivery_id }
  } catch (error) {
    console.error("Error sending email:", error)

    if (message_id) {
      await EmailDeliveryTracker.updateDeliveryStatus(message_id, "failed", {
        error_message: error instanceof Error ? error.message : "Unknown error",
      })

      triggerDeliveryStatusEvent(message_id, targetRecipient, "failed", {
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    }

    throw error
  }
}

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  const mailOptions = {
    to: email,
    subject: "Verify your email address",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up! Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #ff6b35, #f7931e); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  }

  await sendEmail(mailOptions)
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  const mailOptions = {
    to: email,
    subject: "Reset your password",
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #ff6b35, #f7931e); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request this password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  }

  await sendEmail(mailOptions)
}
