import { NextResponse } from "next/server"
import { type ZodError } from "zod"

export type SettingsSection = "account" | "profile" | "security" | "notifications" | "preferences" | "billing"
export type SettingsErrors = Partial<Record<SettingsSection, Record<string, string>>>

type ErrorPayloadOptions = {
  code: string
  message: string
  status: number
  errors?: SettingsErrors
}

export function settingsError({ code, message, status, errors = {} }: ErrorPayloadOptions) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: {
          validationErrors: errors,
        },
      },
      errors,
    },
    { status },
  )
}

export function sectionFieldError(section: SettingsSection, field: string, message: string): SettingsErrors {
  return {
    [section]: {
      [field]: message,
    },
  }
}

export function zodSectionErrors(section: SettingsSection, validationError: ZodError): SettingsErrors {
  const fieldErrors: Record<string, string> = {}

  for (const issue of validationError.issues) {
    const leafField = issue.path.length > 0 ? String(issue.path[issue.path.length - 1]) : "_section"
    if (!fieldErrors[leafField]) {
      fieldErrors[leafField] = issue.message
    }
  }

  return {
    [section]: fieldErrors,
  }
}
