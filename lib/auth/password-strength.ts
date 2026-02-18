export interface PasswordStrengthResult {
  score: number
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong"
  checks: Array<{ label: string; passed: boolean }>
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /\d/.test(password) },
    { label: "Special character", passed: /[^A-Za-z\d]/.test(password) },
  ]

  const passedCount = checks.filter((check) => check.passed).length
  const score = Math.round((passedCount / checks.length) * 100)

  if (score <= 20) return { score, label: "Very weak", checks }
  if (score <= 40) return { score, label: "Weak", checks }
  if (score <= 60) return { score, label: "Fair", checks }
  if (score <= 80) return { score, label: "Strong", checks }
  return { score, label: "Very strong", checks }
}
