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

export class Resend {
  constructor(private readonly apiKey?: string) {}

  public readonly emails = {
    send: async (payload: SendEmailPayload): Promise<{ data: unknown; error: ResendError | null }> => {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          let message = "Resend email send failed"

          try {
            const errorBody = (await response.json()) as { message?: string }
            if (typeof errorBody.message === "string" && errorBody.message.length > 0) {
              message = errorBody.message
            }
          } catch {
            const errorText = await response.text()
            if (errorText.length > 0) {
              message = errorText
            }
          }

          return {
            data: null,
            error: {
              name: "ResendError",
              message,
              statusCode: response.status,
            },
          }
        }

        const data = (await response.json()) as unknown
        return { data, error: null }
      } catch (error) {
        return {
          data: null,
          error: {
            name: "ResendNetworkError",
            message: error instanceof Error ? error.message : "Unknown Resend network error",
            statusCode: 503,
          },
        }
      }
    },
  }
}
