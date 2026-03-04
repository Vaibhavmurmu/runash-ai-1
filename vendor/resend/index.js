class Resend {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.emails = {
      send: async (payload) => {
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
            let body
            try {
              body = await response.json()
            } catch {
              body = { message: await response.text() }
            }

            return {
              data: null,
              error: {
                name: "ResendError",
                message: body?.message || "Resend email send failed",
                statusCode: response.status,
              },
            }
          }

          const data = await response.json()
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
}

module.exports = { Resend }
