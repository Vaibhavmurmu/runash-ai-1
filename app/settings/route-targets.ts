import type { SettingsCategory } from "@/components/settings/types"

export type SettingsRouteTarget = {
  section: SettingsCategory
  panel: string
}

export const settingsRouteTargets = {
  profile: { section: "account", panel: "profile" },
  billing: { section: "billing", panel: "upgrade" },
  invoices: { section: "billing", panel: "invoice-delivery" },
  usage: { section: "usage", panel: "usage-meters" },
  credits: { section: "usage", panel: "credits-balance" },
  refer: { section: "usage", panel: "refer-earn" },
  security: { section: "security", panel: "password" },
  sessions: { section: "account", panel: "sessions" },
  devices: { section: "account", panel: "devices" },
  apiKeys: { section: "api-keys", panel: "api-security" },
} satisfies Record<string, SettingsRouteTarget>
