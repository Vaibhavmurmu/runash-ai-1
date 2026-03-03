import type { EmailEvent } from "./events"

export interface RenderedEmailTemplate {
  subject: string
  html: string
  text?: string
  from?: string
}

export function renderEmailTemplate(event: EmailEvent): RenderedEmailTemplate {
  if (event.type === "USER_VERIFY_EMAIL") {
    const { name, verificationUrl } = event.payload
    return {
      subject: "Verify your email address",
      html: `<div><p>Hi ${name},</p><p>Please verify your account.</p><p><a href="${verificationUrl}">Verify Email</a></p></div>`,
      text: `Hi ${name}, verify your account at: ${verificationUrl}`,
    }
  }

  if (event.type === "CONTACT_FORM_RECEIVED") {
    const { contactName, contactEmail, message, submittedAt } = event.payload
    return {
      subject: `New contact form submission from ${contactName}`,
      html: `<div><p>Name: ${contactName}</p><p>Email: ${contactEmail}</p><p>Submitted: ${submittedAt}</p><p>Message:</p><p>${message}</p></div>`,
      text: `Name: ${contactName}\nEmail: ${contactEmail}\nSubmitted: ${submittedAt}\nMessage: ${message}`,
    }
  }

  if (event.type === "SUBSCRIPTION_RENEWED") {
    const { name, planName, renewedAt, amount } = event.payload
    return {
      subject: `Your ${planName} subscription was renewed`,
      html: `<div><p>Hi ${name},</p><p>Your ${planName} subscription renewed on ${renewedAt}.</p><p>Amount: ${amount}</p></div>`,
      text: `Hi ${name}, your ${planName} subscription renewed on ${renewedAt}. Amount: ${amount}`,
    }
  }

  const { subject, html, text, from } = event.payload
  return {
    subject,
    html,
    text,
    from,
  }
}
