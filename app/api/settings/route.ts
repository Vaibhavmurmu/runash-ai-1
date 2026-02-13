import { type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { respondError, respondSuccess } from "@/lib/api/envelope"
import { authOptions } from "@/lib/auth"
import { getSql } from "@/lib/db/neon"

type AttachmentMetadata = {
  url: string
  filename: string
  mimeType: string
  size: number
  uploadedAt: string
}

type UserSettings = {
  account: {
    email: string
    phone: string
  }
  profile: {
    displayName: string
    bio: string
    avatarAttachment: AttachmentMetadata | null
    bannerAttachment: AttachmentMetadata | null
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
    language: "en" | "es" | "fr"
    feedbackNotes: string
    feedbackAttachments: AttachmentMetadata[]
  }
  billing: {
    invoiceEmail: string
    autoRechargeEnabled: boolean
    planName: string
    subscriptionStatus: "active" | "trial" | "at_risk" | "past_due"
    billingMethodSummary: string
    usageThisCycle: number
    usageLimit: number
    creditsBalance: number
    referralCode: string
  }
}

type PersistedUserSettings = Omit<UserSettings, "security"> & {
  security: Omit<UserSettings["security"], "newPassword"> & {
    apiKeyHash?: string
  }
}

type SettingsVersionMeta = {
  version: number
  updatedAt: string
  updatedBy: number
}

type ValidationFieldErrors = Partial<Record<keyof UserSettings, Record<string, string>>>

type SettingsPatchPayload = Partial<UserSettings> & {
  meta?: {
    settingsVersion?: number
  }
}

const attachmentMetadataSchema = z
  .object({
    url: z.string().max(2048),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(128),
    size: z.number().int().nonnegative().max(25 * 1024 * 1024),
    uploadedAt: z.string().datetime(),
  })
  .strict()

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

const profileAttachmentSchema = z
  .object({
    profile: z
      .object({
        avatarAttachment: attachmentMetadataSchema.nullable().optional(),
        bannerAttachment: attachmentMetadataSchema.nullable().optional(),
      })
      .partial()
      .strict(),
  })
  .strict()

const preferencesAttachmentSchema = z
  .object({
    preferences: z
      .object({
        feedbackAttachments: z.array(attachmentMetadataSchema).max(8).optional(),
      })
      .partial()
      .strict(),
  })
  .strict()

const billingPatchSchema = z
  .object({
    billing: z
      .object({
        invoiceEmail: z.string().email().max(320).optional(),
        autoRechargeEnabled: z.boolean().optional(),
        planName: z.string().trim().min(1).max(120).optional(),
        subscriptionStatus: z.enum(["active", "trial", "at_risk", "past_due"]).optional(),
        billingMethodSummary: z.string().trim().max(512).optional(),
        usageThisCycle: z.number().nonnegative().max(1_000_000_000).optional(),
        usageLimit: z.number().nonnegative().max(1_000_000_000).optional(),
        creditsBalance: z.number().nonnegative().max(1_000_000_000).optional(),
        referralCode: z.string().trim().max(64).optional(),
      })
      .partial()
      .strict(),
  })
  .strict()

const defaultSettings: UserSettings = {
  account: {
    email: "",
    phone: "",
  },
  profile: {
    displayName: "",
    bio: "",
    avatarAttachment: null,
    bannerAttachment: null,
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
    language: "en",
    feedbackNotes: "",
    feedbackAttachments: [],
  },
  billing: {
    invoiceEmail: "",
    autoRechargeEnabled: false,
    planName: "Starter",
    subscriptionStatus: "trial",
    billingMethodSummary: "No default payment method on file.",
    usageThisCycle: 0,
    usageLimit: 1000,
    creditsBalance: 0,
    referralCode: "",
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

function sanitizeAttachment(input: unknown): AttachmentMetadata | null {
  const result = attachmentMetadataSchema.safeParse(input)
  if (!result.success) {
    return null
  }

  return {
    url: result.data.url.trim(),
    filename: result.data.filename.trim(),
    mimeType: result.data.mimeType.trim().toLowerCase(),
    size: result.data.size,
    uploadedAt: result.data.uploadedAt,
  }
}

function sanitizeAttachmentList(input: unknown): AttachmentMetadata[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input.map((item) => sanitizeAttachment(item)).filter((item): item is AttachmentMetadata => Boolean(item)).slice(0, 8)
}

function normalizeBilling(input: Partial<UserSettings["billing"]> | undefined): UserSettings["billing"] {
  return {
    invoiceEmail: typeof input?.invoiceEmail === "string" ? input.invoiceEmail.trim() : defaultSettings.billing.invoiceEmail,
    autoRechargeEnabled:
      typeof input?.autoRechargeEnabled === "boolean" ? input.autoRechargeEnabled : defaultSettings.billing.autoRechargeEnabled,
    planName:
      typeof input?.planName === "string" && input.planName.trim().length > 0
        ? input.planName.trim().slice(0, 120)
        : defaultSettings.billing.planName,
    subscriptionStatus:
      input?.subscriptionStatus === "active" ||
      input?.subscriptionStatus === "trial" ||
      input?.subscriptionStatus === "at_risk" ||
      input?.subscriptionStatus === "past_due"
        ? input.subscriptionStatus
        : defaultSettings.billing.subscriptionStatus,
    billingMethodSummary:
      typeof input?.billingMethodSummary === "string"
        ? input.billingMethodSummary.trim().slice(0, 512)
        : defaultSettings.billing.billingMethodSummary,
    usageThisCycle:
      typeof input?.usageThisCycle === "number" && Number.isFinite(input.usageThisCycle)
        ? Math.max(0, Math.min(input.usageThisCycle, 1_000_000_000))
        : defaultSettings.billing.usageThisCycle,
    usageLimit:
      typeof input?.usageLimit === "number" && Number.isFinite(input.usageLimit)
        ? Math.max(0, Math.min(input.usageLimit, 1_000_000_000))
        : defaultSettings.billing.usageLimit,
    creditsBalance:
      typeof input?.creditsBalance === "number" && Number.isFinite(input.creditsBalance)
        ? Math.max(0, Math.min(input.creditsBalance, 1_000_000_000))
        : defaultSettings.billing.creditsBalance,
    referralCode:
      typeof input?.referralCode === "string" ? input.referralCode.trim().slice(0, 64) : defaultSettings.billing.referralCode,
  }
}

function normalizeVersionMeta(raw: unknown, fallbackUpdatedAt: string, fallbackUpdatedBy = 0): SettingsVersionMeta {
  const input = raw && typeof raw === "object" ? (raw as Partial<SettingsVersionMeta>) : {}
  return {
    version: typeof input.version === "number" && Number.isFinite(input.version) && input.version >= 1 ? input.version : 1,
    updatedAt:
      typeof input.updatedAt === "string" && input.updatedAt.length > 0
        ? input.updatedAt
        : fallbackUpdatedAt,
    updatedBy:
      typeof input.updatedBy === "number" && Number.isFinite(input.updatedBy) && input.updatedBy > 0
        ? input.updatedBy
        : fallbackUpdatedBy,
  }
}

type SettingsReadResult = {
  settings: UserSettings
  meta: SettingsVersionMeta
  source: "new" | "legacy"
}

async function writeSettingsToNewStore(
  sql: ReturnType<typeof getSql>,
  userId: number,
  settings: UserSettings,
  meta: SettingsVersionMeta,
  options?: { source?: "api" | "lazy_migration" | "backfill" },
) {
  const persisted = toPersistedSettings(settings)
  const source = options?.source ?? "api"

  await sql/* sql */`
    INSERT INTO public.user_settings (user_id, settings, version, updated_by, updated_at, migrated_from_legacy)
    VALUES (
      ${userId},
      ${JSON.stringify(persisted)}::jsonb,
      ${meta.version},
      ${meta.updatedBy || userId},
      ${meta.updatedAt}::timestamptz,
      ${source !== "api"}
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      settings = EXCLUDED.settings,
      version = EXCLUDED.version,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at,
      migrated_from_legacy = public.user_settings.migrated_from_legacy OR EXCLUDED.migrated_from_legacy
  `

  await sql/* sql */`DELETE FROM public.user_setting_attachments WHERE user_id = ${userId}`

  const attachments: Array<{ slot: string; ordinal: number; value: AttachmentMetadata }> = []
  if (settings.profile.avatarAttachment) {
    attachments.push({ slot: "avatar", ordinal: 0, value: settings.profile.avatarAttachment })
  }
  if (settings.profile.bannerAttachment) {
    attachments.push({ slot: "banner", ordinal: 0, value: settings.profile.bannerAttachment })
  }

  settings.preferences.feedbackAttachments.forEach((attachment, index) => {
    attachments.push({ slot: "feedback", ordinal: index, value: attachment })
  })

  for (const attachment of attachments) {
    await sql/* sql */`
      INSERT INTO public.user_setting_attachments (
        user_id,
        attachment_slot,
        attachment_order,
        url,
        filename,
        mime_type,
        size,
        uploaded_at
      )
      VALUES (
        ${userId},
        ${attachment.slot},
        ${attachment.ordinal},
        ${attachment.value.url},
        ${attachment.value.filename},
        ${attachment.value.mimeType},
        ${attachment.value.size},
        ${attachment.value.uploadedAt}::timestamptz
      )
    `
  }

  await sql/* sql */`
    INSERT INTO public.user_settings_audit (
      user_id,
      version,
      updated_by,
      updated_at,
      source,
      settings,
      notes
    )
    VALUES (
      ${userId},
      ${meta.version},
      ${meta.updatedBy || userId},
      ${meta.updatedAt}::timestamptz,
      ${source},
      ${JSON.stringify(persisted)}::jsonb,
      ${source === "api" ? "settings api write" : "legacy-to-db migration"}
    )
  `
}

async function readSettings(sql: ReturnType<typeof getSql>, userId: number): Promise<SettingsReadResult | null> {
  const [storedRow] = await sql/* sql */`
    SELECT us.user_id, us.settings, us.version, us.updated_at, us.updated_by, u.email
    FROM public.user_settings us
    JOIN public.users u ON u.id = us.user_id
    WHERE us.user_id = ${userId}
    LIMIT 1
  `

  if (storedRow) {
    const attachmentRows = await sql/* sql */`
      SELECT attachment_slot, attachment_order, url, filename, mime_type, size, uploaded_at
      FROM public.user_setting_attachments
      WHERE user_id = ${userId}
      ORDER BY attachment_slot, attachment_order
    `

    const normalized = normalizeSettings(storedRow.settings, storedRow.email ?? "")
    const feedbackAttachments: AttachmentMetadata[] = []

    for (const row of attachmentRows) {
      const hydrated = sanitizeAttachment({
        url: row.url,
        filename: row.filename,
        mimeType: row.mime_type,
        size: Number(row.size),
        uploadedAt: new Date(row.uploaded_at ?? Date.now()).toISOString(),
      })

      if (!hydrated) {
        continue
      }

      if (row.attachment_slot === "avatar") {
        normalized.profile.avatarAttachment = hydrated
      } else if (row.attachment_slot === "banner") {
        normalized.profile.bannerAttachment = hydrated
      } else if (row.attachment_slot === "feedback") {
        feedbackAttachments.push(hydrated)
      }
    }

    if (feedbackAttachments.length > 0) {
      normalized.preferences.feedbackAttachments = feedbackAttachments
    }

    return {
      settings: normalized,
      meta: {
        version: Number(storedRow.version) || 1,
        updatedAt: new Date(storedRow.updated_at ?? Date.now()).toISOString(),
        updatedBy: Number(storedRow.updated_by) || userId,
      },
      source: "new",
    }
  }

  const [legacyRow] = await sql/* sql */`
    SELECT id, email, bio, updated_at
    FROM public.users
    WHERE id = ${userId}
    LIMIT 1
  `

  if (!legacyRow) {
    return null
  }

  const parsedBio = parseBio(legacyRow.bio)
  const settings = normalizeSettings(parsedBio.userSettings, legacyRow.email ?? "")
  const meta = normalizeVersionMeta(parsedBio.userSettingsMeta, new Date(legacyRow.updated_at ?? Date.now()).toISOString(), userId)

  await writeSettingsToNewStore(sql, userId, settings, meta, {
    source: "lazy_migration"
  })

  return { settings, meta, source: "legacy" }
}

function mapZodErrorsToFieldMap(section: keyof UserSettings, issues: z.ZodIssue[]): ValidationFieldErrors {
  const fieldErrors: Record<string, string> = {}

  for (const issue of issues) {
    const path = issue.path.filter((part) => typeof part === "string") as string[]
    const leafField = path[path.length - 1] ?? "_section"
    if (!fieldErrors[leafField]) {
      fieldErrors[leafField] = issue.message
    }
  }

  return { [section]: fieldErrors }
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
      avatarAttachment: sanitizeAttachment(input.profile?.avatarAttachment),
      bannerAttachment: sanitizeAttachment(input.profile?.bannerAttachment),
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
      feedbackAttachments: sanitizeAttachmentList(input.preferences?.feedbackAttachments),
    },
    billing: {
      ...normalizeBilling({
        ...defaultSettings.billing,
        ...(input.billing ?? {}),
      }),
    },
  }

  return merged
}

function toPersistedSettings(settings: UserSettings, apiKeyHash?: string): PersistedUserSettings {
  return {
    account: settings.account,
    profile: {
      ...settings.profile,
      avatarAttachment: sanitizeAttachment(settings.profile.avatarAttachment),
      bannerAttachment: sanitizeAttachment(settings.profile.bannerAttachment),
    },
    security: {
      twoFactorEnabled: settings.security.twoFactorEnabled,
      apiKeyMasked: settings.security.apiKeyMasked || "Not generated",
      apiKeyLastRotatedAt: settings.security.apiKeyLastRotatedAt || "",
      ...(apiKeyHash ? { apiKeyHash } : {}),
    },
    notifications: settings.notifications,
    preferences: {
      ...settings.preferences,
      feedbackAttachments: sanitizeAttachmentList(settings.preferences.feedbackAttachments),
    },
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

    const result = await readSettings(sql, userId)

    if (!result) {
      return respondError(
        request,
        { code: "USER_NOT_FOUND", message: "User not found" },
        { status: 404, legacy: { error: "User not found" } },
      )
    }

    return respondSuccess(request, withLegacyFields(result.settings), {
      meta: {
        settingsVersion: result.meta.version,
        settingsUpdatedAt: result.meta.updatedAt,
        settingsUpdatedBy: result.meta.updatedBy,
        settingsSource: result.source,
      },
      legacy: withLegacyFields(result.settings),
    })
  } catch {
    return respondError(
      request,
      { code: "SETTINGS_READ_FAILED", message: "Failed to load settings" },
      { status: 500, legacy: { error: "Failed to load settings" } },
    )
  }
}

async function updateSettings(request: NextRequest) {
  try {
    const userId = await resolveUserId(request)
    const payload = (await request.json()) as SettingsPatchPayload
    const sql = getSql()

    if (payload.security) {
      const securityValidation = securityPatchSchema.safeParse({ security: payload.security })
      if (!securityValidation.success) {
        return respondError(
          request,
          {
            code: "INVALID_SECURITY_PAYLOAD",
            message: "Invalid security settings payload",
            details: { validationErrors: mapZodErrorsToFieldMap("security", securityValidation.error.issues) },
          },
          { status: 400, legacy: { error: "Invalid security settings payload" } },
        )
      }
    }

    if (payload.profile) {
      const profileAttachmentValidation = profileAttachmentSchema.safeParse({
        profile: {
          avatarAttachment: payload.profile.avatarAttachment,
          bannerAttachment: payload.profile.bannerAttachment,
        },
      })

      if (!profileAttachmentValidation.success) {
        return respondError(
          request,
          {
            code: "INVALID_PROFILE_ATTACHMENT_PAYLOAD",
            message: "Invalid profile attachment metadata",
            details: { validationErrors: mapZodErrorsToFieldMap("profile", profileAttachmentValidation.error.issues) },
          },
          { status: 400, legacy: { error: "Invalid profile attachment metadata" } },
        )
      }
    }

    if (payload.preferences?.feedbackAttachments) {
      const preferencesAttachmentValidation = preferencesAttachmentSchema.safeParse({
        preferences: {
          feedbackAttachments: payload.preferences.feedbackAttachments,
        },
      })

      if (!preferencesAttachmentValidation.success) {
        return respondError(
          request,
          {
            code: "INVALID_FEEDBACK_ATTACHMENT_PAYLOAD",
            message: "Invalid feedback attachment metadata",
            details: { validationErrors: mapZodErrorsToFieldMap("preferences", preferencesAttachmentValidation.error.issues) },
          },
          { status: 400, legacy: { error: "Invalid feedback attachment metadata" } },
        )
      }
    }

    if (payload.billing) {
      const billingValidation = billingPatchSchema.safeParse({ billing: payload.billing })
      if (!billingValidation.success) {
        return respondError(
          request,
          {
            code: "INVALID_BILLING_PAYLOAD",
            message: "Invalid billing metadata payload",
            details: { validationErrors: mapZodErrorsToFieldMap("billing", billingValidation.error.issues) },
          },
          { status: 400, legacy: { error: "Invalid billing metadata payload" } },
        )
      }
    }

    const [row] = await sql/* sql */`
      SELECT id, email, bio, updated_at
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

    const currentState = await readSettings(sql, userId)
    if (!currentState) {
      return respondError(
        request,
        { code: "USER_NOT_FOUND", message: "User not found" },
        { status: 404, legacy: { error: "User not found" } },
      )
    }

    const parsedBio = parseBio(row.bio)
    const currentMeta = currentState.meta
    const requestVersion = payload.meta?.settingsVersion
    if (typeof requestVersion === "number" && requestVersion !== currentMeta.version) {
      return respondError(
        request,
        {
          code: "SETTINGS_VERSION_CONFLICT",
          message: "Settings were updated by another request. Refresh and retry.",
          details: {
            validationErrors: {
              account: {
                _section: "Settings are out of date. Please refresh before saving.",
              },
            },
            expectedVersion: currentMeta.version,
          },
        },
        { status: 409, legacy: { error: "Settings conflict detected. Please refresh and retry." } },
      )
    }

    const persistedSecurity =
      parsedBio.userSettings && typeof parsedBio.userSettings === "object"
        ? ((parsedBio.userSettings as Record<string, unknown>).security as { apiKeyHash?: string } | undefined)
        : undefined
    const existingApiKeyHash = typeof persistedSecurity?.apiKeyHash === "string" ? persistedSecurity.apiKeyHash : undefined
    const existingSettings = currentState.settings
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
          avatarAttachment:
            payload.profile?.avatarAttachment !== undefined
              ? sanitizeAttachment(payload.profile.avatarAttachment)
              : existingSettings.profile.avatarAttachment,
          bannerAttachment:
            payload.profile?.bannerAttachment !== undefined
              ? sanitizeAttachment(payload.profile.bannerAttachment)
              : existingSettings.profile.bannerAttachment,
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
          feedbackAttachments:
            payload.preferences?.feedbackAttachments !== undefined
              ? sanitizeAttachmentList(payload.preferences.feedbackAttachments)
              : existingSettings.preferences.feedbackAttachments,
        },
        billing: {
          ...normalizeBilling({
            ...existingSettings.billing,
            ...(payload.billing ?? {}),
          }),
        },
      },
      row.email ?? "",
    )

    const nextMeta: SettingsVersionMeta = {
      version: currentMeta.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }

    const mergedBio = {
      ...parsedBio,
      userSettings: toPersistedSettings(mergedSettings, existingApiKeyHash),
      userSettingsMeta: nextMeta,
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

    await writeSettingsToNewStore(sql, userId, mergedSettings, nextMeta, { source: "api" })

    return respondSuccess(request, withLegacyFields(mergedSettings), {
      meta: {
        settingsVersion: nextMeta.version,
        settingsUpdatedAt: nextMeta.updatedAt,
        settingsUpdatedBy: nextMeta.updatedBy,
        settingsSource: "new",
      },
      legacy: withLegacyFields(mergedSettings),
    })
  } catch {
    return respondError(
      request,
      { code: "SETTINGS_UPDATE_FAILED", message: "Failed to update settings" },
      { status: 500, legacy: { error: "Failed to update settings" } },
    )
  }
}

export async function PUT(request: NextRequest) {
  return updateSettings(request)
}

export async function PATCH(request: NextRequest) {
  return updateSettings(request)
}
