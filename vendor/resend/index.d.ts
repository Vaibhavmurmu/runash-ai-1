export interface ResendTag {
  name: string
  value: string
}

export interface ResendAttachment {
  filename: string
  content: string
  contentType?: string
}

export interface SendEmailPayload {
  from: string
  to: string[]
  subject: string
  html: string
  text?: string
  headers?: Record<string, string>
  attachments?: ResendAttachment[]
  replyTo?: string[]
  scheduledAt?: string
  tags?: ResendTag[]
  idempotencyKey?: string
}

export interface ResendError {
  name: string
  message: string
  statusCode?: number
}

export declare class Resend {
  constructor(apiKey?: string)
  emails: {
    send(payload: SendEmailPayload): Promise<{ data: unknown; error: ResendError | null }>
  }
}
