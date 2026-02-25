export type RegisterPayload = {
  email: string
  password: string
  name: string
  username?: string
}

export type RegisterUser = {
  id?: string
  email?: string
  name?: string
  username?: string
  emailVerified?: boolean
}

export type RegisterResponse = {
  ok: boolean
  status: number
  message: string
  user?: RegisterUser
}

export function buildFallbackUsername(email: string) {
  const base = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, "") || "runash-user"
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base.slice(0, 12)}-${suffix}`
}

export async function registerWithUnifiedRoute(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      name: payload.name,
      username: payload.username ?? buildFallbackUsername(payload.email),
    }),
  })

  const parsed = await response.json().catch(() => ({} as Record<string, unknown>))
  const envelopeData = parsed && typeof parsed === "object" && parsed.data && typeof parsed.data === "object" ? parsed.data : null
  const user =
    envelopeData && "user" in envelopeData && envelopeData.user && typeof envelopeData.user === "object"
      ? (envelopeData.user as RegisterUser)
      : parsed?.user && typeof parsed.user === "object"
        ? (parsed.user as RegisterUser)
        : undefined

  const defaultMessage = response.ok ? "User created successfully." : "Unable to create account"
  const envelopeMessage =
    envelopeData && "message" in envelopeData && typeof envelopeData.message === "string" ? envelopeData.message : null
  const errorMessage =
    parsed && typeof parsed === "object" && parsed.error && typeof parsed.error === "object" && "message" in parsed.error
      ? parsed.error.message
      : null
  const legacyMessage = parsed && typeof parsed === "object" && typeof parsed.message === "string" ? parsed.message : null

  const messageFromPayload =
    typeof envelopeMessage === "string"
      ? envelopeMessage
      : typeof errorMessage === "string"
        ? errorMessage
        : typeof legacyMessage === "string"
          ? legacyMessage
          : defaultMessage

  return {
    ok: response.ok,
    status: response.status,
    message: messageFromPayload,
    user,
  }
}
