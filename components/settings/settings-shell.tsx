"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AccountSettings } from "@/components/settings/sections/account-settings"
import { BillingSettings } from "@/components/settings/sections/billing-settings"
import { PreferencesSettings } from "@/components/settings/sections/preferences-settings"
import { SecuritySettings } from "@/components/settings/sections/security-settings"
import type { SettingsCategory, SettingsData, SettingsSection } from "@/components/settings/types"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface SettingsShellProps {
  compact?: boolean
}

type RailItem = {
  key: SettingsCategory
  label: string
  panels: Array<{ key: string; label: string }>
}

const railItems: RailItem[] = [
  {
    key: "account",
    label: "Account",
    panels: [
      { key: "profile", label: "Profile" },
      { key: "authentication", label: "Authentication" },
      { key: "sessions", label: "Sessions" },
      { key: "devices", label: "Devices" },
    ],
  },
  {
    key: "security",
    label: "Security",
    panels: [
      { key: "password", label: "Password" },
      { key: "two-factor", label: "2FA" },
      { key: "privacy", label: "Privacy" },
      { key: "api-security", label: "API Keys" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    panels: [
      { key: "subscription", label: "Subscription" },
      { key: "invoice", label: "Invoice" },
      { key: "billing-controls", label: "Auto Recharge" },
      { key: "usage", label: "Usage" },
    ],
  },
  {
    key: "preferences",
    label: "Preferences",
    panels: [
      { key: "notifications", label: "Notifications" },
      { key: "appearance", label: "Theme & Language" },
      { key: "feedback", label: "Feedback" },
    ],
  },
]

const defaultSettingsData: SettingsData = {
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
    language: "en",
    feedbackNotes: "",
  },
  billing: {
    invoiceEmail: "",
    autoRechargeEnabled: false,
  },
}

const isSettingsCategory = (value: string | null): value is SettingsCategory =>
  value === "account" || value === "security" || value === "billing" || value === "preferences"

export function SettingsShell({ compact = false }: SettingsShellProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<SettingsCategory>("account")
  const [activePanel, setActivePanel] = useState<string>("profile")
  const [settingsData, setSettingsData] = useState<SettingsData>(defaultSettingsData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<SettingsSection, string>>>({})
  const [oneTimeApiKey, setOneTimeApiKey] = useState<string | null>(null)
  const sectionContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const activeRailItem = useMemo(() => railItems.find((item) => item.key === activeSection) ?? railItems[0], [activeSection])

  const scrollToPanel = (panelKey: string, behavior: ScrollBehavior = "smooth") => {
    window.requestAnimationFrame(() => {
      const element = document.getElementById(`settings-panel-${panelKey}`)
      if (!element) {
        return
      }
      element.scrollIntoView({ behavior, block: "start" })
    })
  }

  const setSectionAndPanel = (section: SettingsCategory, panel?: string) => {
    const firstPanel = railItems.find((item) => item.key === section)?.panels[0]?.key ?? ""
    const nextPanel = panel && railItems.find((item) => item.key === section)?.panels.some((item) => item.key === panel) ? panel : firstPanel
    setActiveSection(section)
    setActivePanel(nextPanel)
  }

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/settings")
        if (!response.ok) {
          throw new Error("Failed to load settings")
        }

        const payload = await response.json()
        const data = payload?.data ?? payload
        setSettingsData((prev) => ({
          ...prev,
          ...data,
          account: { ...prev.account, ...(data?.account ?? {}) },
          profile: { ...prev.profile, ...(data?.profile ?? {}) },
          security: { ...prev.security, ...(data?.security ?? {}), newPassword: "" },
          notifications: { ...prev.notifications, ...(data?.notifications ?? {}) },
          preferences: { ...prev.preferences, ...(data?.preferences ?? {}) },
          billing: { ...prev.billing, ...(data?.billing ?? {}) },
        }))
      } catch {
        toast({ title: "Failed to load settings", description: "Please refresh and try again.", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [toast])

  useEffect(() => {
    const sectionParam = searchParams.get("section")
    const panelParam = searchParams.get("panel")

    if (!isSettingsCategory(sectionParam)) {
      return
    }

    const nextRailItem = railItems.find((item) => item.key === sectionParam)
    if (!nextRailItem) {
      return
    }

    const nextPanel = nextRailItem.panels.some((panel) => panel.key === panelParam)
      ? panelParam
      : nextRailItem.panels[0]?.key

    if (sectionParam !== activeSection || (nextPanel && nextPanel !== activePanel)) {
      setSectionAndPanel(sectionParam, nextPanel)
      if (nextPanel) {
        scrollToPanel(nextPanel, "auto")
      }
    }
  }, [activePanel, activeSection, searchParams])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const sectionChanged = params.get("section") !== activeSection
    const panelChanged = params.get("panel") !== activePanel

    if (!sectionChanged && !panelChanged) {
      return
    }

    params.set("section", activeSection)
    params.set("panel", activePanel)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activePanel, activeSection, pathname, router, searchParams])

  useEffect(() => {
    const container = sectionContainerRef.current
    if (!container) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const nextActive = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
          .map((entry) => entry.target.getAttribute("data-settings-panel"))
          .find((value): value is string => Boolean(value))

        if (nextActive) {
          setActivePanel(nextActive)
        }
      },
      {
        root: null,
        threshold: [0.35, 0.6],
        rootMargin: "-100px 0px -45% 0px",
      }
    )

    const panels = Array.from(container.querySelectorAll<HTMLElement>("[data-settings-panel]"))
    panels.forEach((panel) => observer.observe(panel))

    return () => {
      observer.disconnect()
    }
  }, [activeSection])

  const onFieldChange = <TSection extends SettingsSection, TField extends keyof SettingsData[TSection]>(
    section: TSection,
    field: TField,
    value: SettingsData[TSection][TField]
  ) => {
    setSettingsData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const buildSectionPayload = (section: SettingsSection) => {
    if (section !== "security") {
      return { [section]: settingsData[section] }
    }

    return {
      security: {
        newPassword: settingsData.security.newPassword,
        twoFactorEnabled: settingsData.security.twoFactorEnabled,
      },
    }
  }

  const saveSection = async (section: SettingsSection) => {
    setIsSaving(true)
    setErrors((prev) => ({ ...prev, [section]: "" }))

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSectionPayload(section)),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      const payload = await response.json()
      const data = payload?.data ?? payload
      setSettingsData((prev) => ({
        ...prev,
        ...data,
        security: { ...prev.security, ...(data?.security ?? {}), newPassword: "" },
      }))

      toast({ title: "Settings saved", description: `${section} settings updated successfully.` })
    } catch {
      setErrors((prev) => ({ ...prev, [section]: "Failed to save changes. Please retry." }))
      toast({ title: "Save failed", description: `Could not save ${section} settings.`, variant: "destructive" })
    } finally {
      setSettingsData((prev) => ({
        ...prev,
        security: { ...prev.security, newPassword: "" },
      }))
      setIsSaving(false)
    }
  }

  const executeAction = async (
    endpoint: string,
    successTitle: string,
    successDescription: string,
    method: "POST" | "DELETE" = "POST",
    body?: Record<string, unknown>
  ) => {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      toast({ title: "Action failed", description: "Please retry.", variant: "destructive" })
      return null
    }

    const payload = (await response.json().catch(() => ({}))) as { data?: Record<string, unknown>; apiKey?: string }
    const data = payload?.data ?? payload

    toast({ title: successTitle, description: successDescription })
    return data
  }

  const isDisabled = isLoading || isSaving

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage grouped settings by Account, Security, Billing, and Preferences.
        </p>
      </div>

      <div className={cn("grid gap-6", compact ? "grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)]")}>
        <aside className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
          <div className={cn("gap-2", compact ? "flex overflow-x-auto pb-1" : "flex flex-col") }>
            {railItems.map((item) => (
              <Button
                key={item.key}
                type="button"
                variant={item.key === activeSection ? "default" : "outline"}
                className={cn(compact ? "h-8 whitespace-nowrap rounded-full px-4" : "justify-start")}
                onClick={() => {
                  const panelKey = item.panels[0]?.key
                  setSectionAndPanel(item.key, panelKey)
                  if (panelKey) {
                    scrollToPanel(panelKey)
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">{activeRailItem.label} panels</p>
            <div className={cn("gap-2", compact ? "flex overflow-x-auto pb-1" : "flex flex-col") }>
              {activeRailItem.panels.map((panel) => (
                <Button
                  key={panel.key}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "justify-start",
                    compact ? "h-8 whitespace-nowrap rounded-full border px-3" : "h-8",
                    panel.key === activePanel ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setActivePanel(panel.key)
                    scrollToPanel(panel.key)
                  }}
                >
                  {panel.label}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        <main ref={sectionContainerRef} className="space-y-6">
          {activeSection === "account" ? (
            <AccountSettings
              data={settingsData}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={errors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
              onAction={(action) => {
                if (action === "revokeSessions") {
                  void executeAction("/api/settings/actions/revoke-sessions", "Sessions revoked", "All sessions were revoked.", "POST", {
                    confirm: true,
                  })
                }
              }}
            />
          ) : null}

          {activeSection === "security" ? (
            <SecuritySettings
              data={settingsData}
              oneTimeApiKey={oneTimeApiKey}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={errors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
              onOneTimeApiKeyDismiss={() => setOneTimeApiKey(null)}
              onAction={(action) => {
                if (action === "regenerateApiKey") {
                  void executeAction(
                    "/api/settings/actions/regenerate-api-key",
                    "API key regenerated",
                    "A new API key is now active.",
                    "POST",
                    { confirm: true }
                  ).then((data) => {
                    if (!data) {
                      return
                    }

                    setSettingsData((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        apiKeyMasked: String(data.apiKeyMasked ?? prev.security.apiKeyMasked),
                        apiKeyLastRotatedAt: String(data.apiKeyLastRotatedAt ?? prev.security.apiKeyLastRotatedAt),
                      },
                    }))
                    setOneTimeApiKey(typeof data.apiKey === "string" ? data.apiKey : null)
                  })
                }
                if (action === "deleteApiKey") {
                  void executeAction(
                    "/api/settings/actions/delete-api-key",
                    "API key deleted",
                    "API key access removed.",
                    "DELETE",
                    { confirm: true }
                  ).then((data) => {
                    if (!data) {
                      return
                    }

                    setOneTimeApiKey(null)
                    setSettingsData((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        apiKeyMasked: String(data.apiKeyMasked ?? "Not generated"),
                        apiKeyLastRotatedAt: String(data.apiKeyLastRotatedAt ?? ""),
                      },
                    }))
                  })
                }
                if (action === "disable2FA") {
                  void executeAction(
                    "/api/settings/actions/disable-2fa",
                    "2FA disabled",
                    "Two-factor authentication disabled.",
                    "POST",
                    { confirm: true }
                  ).then((data) => {
                    if (!data) {
                      return
                    }

                    onFieldChange("security", "twoFactorEnabled", false)
                  })
                }
              }}
            />
          ) : null}

          {activeSection === "billing" ? (
            <BillingSettings
              data={settingsData}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={errors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
              onAction={(action) => {
                if (action === "cancelSubscription") {
                  void executeAction(
                    "/api/settings/actions/cancel-subscription",
                    "Subscription canceled",
                    "Your subscription will end at period close."
                  )
                }
                if (action === "downgradePlan") {
                  void executeAction(
                    "/api/settings/actions/downgrade-plan",
                    "Downgrade scheduled",
                    "Downgrade scheduled for next cycle."
                  )
                }
              }}
            />
          ) : null}

          {activeSection === "preferences" ? (
            <PreferencesSettings
              data={settingsData}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={errors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
