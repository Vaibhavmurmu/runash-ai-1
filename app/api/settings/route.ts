import { type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authOptions } from "@/lib/auth"
import { getSql } from "@/lib/db/neon"

type UserSettings = {
  account: {
    email: string
    phone: string
  }
  profile: {
    displayName: string
    bio: string
  }
  security: {
    newPassword: string
    twoFactorEnabled: boolean
    apiKeyMasked: string
    apiKeyLastRotatedAt: string
  }
  notifications: {
    marketingEmailsEnabled: boolean
    productUpdatesEnabled: boolean
  }
  preferences: {
    theme: "light" | "dark" | "system"
  }
  billing: {
    invoiceEmail: string
    autoRechargeEnabled: boolean
  }
}

type PersistedUserSettings = Omit<UserSettings, "security"> & {
  security: Omit<UserSettings["security"], "newPassword"> & {
    apiKeyHash?: string
  }
}

const securityPatchSchema = z.object({
  security: z
    .object({
      newPassword: z.string().max(256).optional(),
      twoFactorEnabled: z.boolean().optional(),
      apiKeyMasked: z.string().optional(),
      apiKeyLastRotatedAt: z.string().optional(),
    })
    .strict(),
})

const defaultSettings: UserSettings = {
  account: {
    email: "",
    phone: "",
  },
  profile: {
    displayName: "",
    bio: "",
  },
  security: {
    newPassword: "",
    twoFactorEnabled: false,
    apiKeyMasked: "Not generated",
    apiKeyLastRotatedAt: "",
  },
  notifications: {
    marketingEmailsEnabled: true,
    productUpdatesEnabled: true,
  },
  preferences: {
    theme: "system",
  },
  billing: {
    invoiceEmail: "",
    autoRechargeEnabled: false,
  },
}

function parseBio(rawBio: unknown): Record<string, unknown> {
  if (!rawBio) {
    return {}
  }

  if (typeof rawBio === "string") {
    try {
      return JSON.parse(rawBio) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  if (typeof rawBio === "object") {
    return rawBio as Record<string, unknown>
  }

  return {}
}

function normalizeSettings(raw: unknown, accountEmail: string): UserSettings {
  const input = raw && typeof raw === "object" ? (raw as Partial<PersistedUserSettings>) : {}

  const merged = {
    ...defaultSettings,
    ...input,
    account: {
      ...defaultSettings.account,
      ...(input.account ?? {}),
      email: input.account?.email ?? accountEmail,
    },
    profile: {
      ...defaultSettings.profile,
      ...(input.profile ?? {}),
    },
    security: {
      ...defaultSettings.security,
      ...(input.security ?? {}),
      newPassword: "",
    },
    notifications: {
      ...defaultSettings.notifications,
      ...(input.notifications ?? {}),
    },
    preferences: {
      ...defaultSettings.preferences,
      ...(input.preferences ?? {}),
    },
    billing: {
      ...defaultSettings.billing,
      ...(input.billing ?? {}),
    },
  }

  return merged
}

function toPersistedSettings(settings: UserSettings, apiKeyHash?: string): PersistedUserSettings {
  return {
    account: settings.account,
    profile: settings.profile,
    security: {
      twoFactorEnabled: settings.security.twoFactorEnabled,
      apiKeyMasked: settings.security.apiKeyMasked || "Not generated",
      apiKeyLastRotatedAt: settings.security.apiKeyLastRotatedAt || "",
      ...(apiKeyHash ? { apiKeyHash } : {}),
    },
    notifications: settings.notifications,
    preferences: settings.preferences,
    billing: settings.billing,
  }
}

function withLegacyFields(settings: UserSettings) {
  return {
    ...settings,
    email: settings.account.email,
    phone: settings.account.phone,
    displayName: settings.profile.displayName,
    bio: settings.profile.bio,
    twoFactorEnabled: settings.security.twoFactorEnabled,
    marketingEmailsEnabled: settings.notifications.marketingEmailsEnabled,
    productUpdatesEnabled: settings.notifications.productUpdatesEnabled,
    theme: settings.preferences.theme,
    invoiceEmail: settings.billing.invoiceEmail,
    autoRechargeEnabled: settings.billing.autoRechargeEnabled,
  }
}

async function resolveUserId(request: NextRequest): Promise<number> {
  const session = await getServerSession(authOptions)
  const sessionId = Number(session?.user?.id)

  if (Number.isFinite(sessionId) && sessionId > 0) {
    return sessionId
  }

  const headerUserId = Number(request.headers.get("x-user-id") || 1)
  return Number.isFinite(headerUserId) && headerUserId > 0 ? headerUserId : 1
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveUserId(request)
    const sql = getSql()

    const [row] = await sql/* sql */`
      SELECT id, email, bio
      FROM public.users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (!row) {
      return respondError(
        request,
        { code: "USER_NOT_FOUND", message: "User not found" },
        { status: 404, legacy: { error: "User not found" } },
      )
    }

    const parsedBio = parseBio(row.bio)
    const userSettings = normalizeSettings(parsedBio.userSettings, row.email ?? "")

    return respondSuccess(request, withLegacyFields(userSettings), { legacy: withLegacyFields(userSettings) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load settings"
    return respondError(
      request,
      { code: "SETTINGS_READ_FAILED", message },
      { status: 500, legacy: { error: message } },
    )
  }
}

async function updateSettings(request: NextRequest) {
  try {
    const userId = await resolveUserId(request)
    const payload = (await request.json()) as Partial<UserSettings>
    const sql = getSql()

    if (payload.security) {
      const securityValidation = securityPatchSchema.safeParse({ security: payload.security })
      if (!securityValidation.success) {
        return respondError(
          request,
          { code: "INVALID_SECURITY_PAYLOAD", message: "Invalid security settings payload" },
          { status: 400, legacy: { error: "Invalid security settings payload" } },
        )
      }
    }

    const [row] = await sql/* sql */`
      SELECT id, email, bio
      FROM public.users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (!row) {
      return respondError(
        request,
        { code: "USER_NOT_FOUND", message: "User not found" },
        { status: 404, legacy: { error: "User not found" } },
      )
    }

    const parsedBio = parseBio(row.bio)
    const persistedSecurity =
      parsedBio.userSettings && typeof parsedBio.userSettings === "object"
        ? ((parsedBio.userSettings as Record<string, unknown>).security as { apiKeyHash?: string } | undefined)
        : undefined
    const existingApiKeyHash = typeof persistedSecurity?.apiKeyHash === "string" ? persistedSecurity.apiKeyHash : undefined
    const existingSettings = normalizeSettings(parsedBio.userSettings, row.email ?? "")
    const mergedSettings = normalizeSettings(
      {
        ...toPersistedSettings(existingSettings, existingApiKeyHash),
        ...payload,
        account: {
          ...existingSettings.account,
          ...(payload.account ?? {}),
        },
        profile: {
          ...existingSettings.profile,
          ...(payload.profile ?? {}),
        },
        security: {
          ...existingSettings.security,
          newPassword: payload.security?.newPassword ?? existingSettings.security.newPassword,
          twoFactorEnabled: payload.security?.twoFactorEnabled ?? existingSettings.security.twoFactorEnabled,
          apiKeyMasked: existingSettings.security.apiKeyMasked,
          apiKeyLastRotatedAt: existingSettings.security.apiKeyLastRotatedAt,
        },
        notifications: {
          ...existingSettings.notifications,
          ...(payload.notifications ?? {}),
        },
        preferences: {
          ...existingSettings.preferences,
          ...(payload.preferences ?? {}),
        },
        billing: {
          ...existingSettings.billing,
          ...(payload.billing ?? {}),
        },
      },
      row.email ?? "",
    )

    const mergedBio = {
      ...parsedBio,
      userSettings: toPersistedSettings(mergedSettings, existingApiKeyHash),
    }

    const [updated] = await sql/* sql */`
      UPDATE public.users
      SET bio = ${JSON.stringify(mergedBio)}, updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id
    `

    if (!updated) {
      return respondError(
        request,
        { code: "SETTINGS_UPDATE_FAILED", message: "Unable to update settings" },
        { status: 500, legacy: { error: "Unable to update settings" } },
      )
    }

    return respondSuccess(request, withLegacyFields(mergedSettings), { legacy: withLegacyFields(mergedSettings) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update settings"
    return respondError(
      request,
      { code: "SETTINGS_UPDATE_FAILED", message },
      { status: 500, legacy: { error: message } },
    )
  }
}

export async function PUT(request: NextRequest) {
  return updateSettings(request)
}

export async function PATCH(request: NextRequest) {
  return updateSettings(request)
}
