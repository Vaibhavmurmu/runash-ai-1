"use client"

import { evaluatePasswordStrength } from "@/lib/auth/password-strength"

const strengthColorMap: Record<string, string> = {
  "Very weak": "bg-red-500",
  Weak: "bg-orange-500",
  Fair: "bg-amber-500",
  Strong: "bg-lime-500",
  "Very strong": "bg-green-600",
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const result = evaluatePasswordStrength(password)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className="font-medium">{result.label}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full transition-all ${strengthColorMap[result.label] ?? "bg-primary"}`} style={{ width: `${result.score}%` }} />
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {result.checks.map((check) => (
          <li key={check.label} className={check.passed ? "text-green-600" : "text-muted-foreground"}>
            {check.passed ? "✓" : "•"} {check.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
