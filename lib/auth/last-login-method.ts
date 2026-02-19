export type LoginMethod = "password" | "google" | "github" | "google-one-tap" | "phone-otp" | "unknown"

const LAST_LOGIN_METHOD_KEY = "runash:last-login-method"

const labels: Record<LoginMethod, string> = {
  password: "Email + Password",
  google: "Google",
  github: "GitHub",
  "google-one-tap": "Google One Tap",
  "phone-otp": "Phone OTP",
  unknown: "Unknown",
}

export function normalizeLoginMethod(value: string | null | undefined): LoginMethod {
  switch ((value ?? "").toLowerCase()) {
    case "password":
    case "google":
    case "github":
    case "google-one-tap":
    case "phone-otp":
      return value as LoginMethod
    default:
      return "unknown"
  }
}

export function setLastLoginMethod(method: LoginMethod) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(LAST_LOGIN_METHOD_KEY, method)
}

export function getLastLoginMethod(): LoginMethod {
  if (typeof window === "undefined") {
    return "unknown"
  }

  return normalizeLoginMethod(window.localStorage.getItem(LAST_LOGIN_METHOD_KEY))
}

export function formatLoginMethodLabel(method: LoginMethod) {
  return labels[method]
}
