export type SettingsCategory = "account" | "security" | "billing" | "preferences"

export type SettingsSection = "account" | "profile" | "security" | "notifications" | "preferences" | "billing"

export type AttachmentMetadata = {
  url: string
  filename: string
  mimeType: string
  size: number
  uploadedAt: string
}

export type SettingsData = {
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
  }
}
