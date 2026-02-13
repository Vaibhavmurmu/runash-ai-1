"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { AccountSettings } from "@/components/settings/sections/account-settings"
import { BillingSettings } from "@/components/settings/sections/billing-settings"
import { PreferencesSettings } from "@/components/settings/sections/preferences-settings"
import { SecuritySettings } from "@/components/settings/sections/security-settings"
import type { SettingsCategory, SettingsData, SettingsSection } from "@/components/settings/types"

interface SettingsShellProps {
  compact?: boolean
}

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

export function SettingsShell({ compact = false }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState<SettingsCategory>("account")
  const [settingsData, setSettingsData] = useState<SettingsData>(defaultSettingsData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<SettingsSection, string>>>({})
  const { toast } = useToast()

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

  const saveSection = async (section: SettingsSection) => {
    setIsSaving(true)
    setErrors((prev) => ({ ...prev, [section]: "" }))

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: settingsData[section] }),
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
      setIsSaving(false)
    }
  }

  const executeAction = async (
    endpoint: string,
    successTitle: string,
    successDescription: string,
    method: "POST" | "DELETE" = "POST"
  ) => {
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" } })
    if (!response.ok) {
      toast({ title: "Action failed", description: "Please retry.", variant: "destructive" })
      return
    }

    toast({ title: successTitle, description: successDescription })
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsCategory)} className="space-y-4">
        <div className={compact ? "overflow-x-auto" : "overflow-x-auto md:overflow-visible"}>
          <TabsList className="grid h-auto min-w-[560px] grid-cols-4 gap-2 md:min-w-0">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="account">
          <AccountSettings
            data={settingsData}
            isDisabled={isDisabled}
            isSaving={isSaving}
            errors={errors}
            onFieldChange={onFieldChange}
            onSave={saveSection}
            onAction={(action) => {
              if (action === "revokeSessions") {
                void executeAction("/api/settings/actions/revoke-sessions", "Sessions revoked", "All sessions were revoked.")
              }
            }}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings
            data={settingsData}
            isDisabled={isDisabled}
            isSaving={isSaving}
            errors={errors}
            onFieldChange={onFieldChange}
            onSave={saveSection}
            onAction={(action) => {
              if (action === "regenerateApiKey") {
                void executeAction(
                  "/api/settings/actions/regenerate-api-key",
                  "API key regenerated",
                  "A new API key is now active."
                )
              }
              if (action === "deleteApiKey") {
                void executeAction("/api/settings/actions/delete-api-key", "API key deleted", "API key access removed.", "DELETE")
              }
              if (action === "disable2FA") {
                void executeAction("/api/settings/actions/disable-2fa", "2FA disabled", "Two-factor authentication disabled.")
                onFieldChange("security", "twoFactorEnabled", false)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="billing">
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
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSettings
            data={settingsData}
            isDisabled={isDisabled}
            isSaving={isSaving}
            errors={errors}
            onFieldChange={onFieldChange}
            onSave={saveSection}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
