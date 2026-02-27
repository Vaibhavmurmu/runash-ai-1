"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AccountSectionPanel } from "@/components/settings/sections/account-section-panel"
import { BillingSectionPanel } from "@/components/settings/sections/billing-section-panel"
import { ConfirmSettingsActionDialog } from "@/components/settings/confirm-settings-action-dialog"
import { SecuritySectionPanel } from "@/components/settings/sections/security-section-panel"
import { WorkspaceSectionPanel } from "@/components/settings/sections/workspace-section-panel"
import type { SettingsCategory, SettingsData, SettingsSection } from "@/components/settings/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface SettingsShellProps {
  compact?: boolean
  initialSection?: SettingsCategory
  initialPanel?: string
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
    key: "workspace",
    label: "Workspace",
    panels: [
      { key: "notifications", label: "Notifications" },
      { key: "appearance", label: "Theme & language" },
      { key: "feedback", label: "Feedback" },
    ],
  },
  {
    key: "security",
    label: "Security",
    panels: [
      { key: "password", label: "Password" },
      { key: "two-factor", label: "2FA" },
      { key: "privacy", label: "Privacy" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    panels: [
      { key: "upgrade", label: "Upgrade" },
      { key: "subscription", label: "Subscription" },
      { key: "invoice-delivery", label: "Invoices" },
      { key: "billing-method", label: "Billing method" },
    ],
  },
  {
    key: "usage",
    label: "Usage",
    panels: [
      { key: "usage-meters", label: "Usage meters" },
      { key: "credits-balance", label: "Credits balance" },
      { key: "refer-earn", label: "Refer & earn" },
    ],
  },
  {
    key: "api-keys",
    label: "API Keys",
    panels: [{ key: "api-security", label: "Manage keys" }],
  },
  {
    key: "data-controls",
    label: "Data Controls",
    panels: [
      { key: "privacy", label: "Privacy" },
      { key: "api-security", label: "API access" },
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

const isSettingsCategory = (value: string | null): value is SettingsCategory =>
  value === "account" ||
  value === "workspace" ||
  value === "security" ||
  value === "billing" ||
  value === "usage" ||
  value === "api-keys" ||
  value === "data-controls"

const sectionAliasMap: Record<string, SettingsCategory> = {
  preferences: "workspace",
  apikeys: "api-keys",
  apiKeys: "api-keys",
  data: "data-controls",
}

const panelAliasMap: Record<string, string> = {
  invoices: "invoice-delivery",
}

const normalizeSection = (section: string | null): SettingsCategory | null => {
  if (!section) {
    return null
  }

  if (isSettingsCategory(section)) {
    return section
  }

  return sectionAliasMap[section] ?? null
}

const normalizePanel = (panel: string | null) => (panel ? panelAliasMap[panel] ?? panel : panel)

const getPanelForSection = (section: SettingsCategory, panel?: string | null) => {
  const panels = railItems.find((item) => item.key === section)?.panels ?? []
  if (panel && panels.some((item) => item.key === panel)) {
    return panel
  }

  return panels[0]?.key ?? ""
}

type BillingAction =
  | "upgradePlan"
  | "manageSubscription"
  | "saveInvoiceDelivery"
  | "billingMethodSummary"
  | "usageMeters"
  | "creditsBalance"
  | "referAndEarn"

type BillingActionConfig = {
  endpoint: string
  successTitle: string
  successDescription: string
  method?: "GET" | "POST" | "DELETE"
  body?: Record<string, unknown>
  requiresConfirmation?: boolean
  confirmationTitle?: string
  confirmationDescription?: string
}

type PendingSettingsActionDialog = {
  title: string
  description: string
  consequence: string
  irreversibleWarning?: string
  confirmLabel: string
  loadingLabel: string
  successMessage: string
  destructive?: boolean
  onConfirm: () => Promise<void>
}



type ValidationErrorResponse = {
  error?: {
    message?: string
    details?: {
      validationErrors?: Partial<Record<SettingsSection, Record<string, string>>>
    }
  }
}

function toSectionErrorMap(errors: Partial<Record<SettingsSection, Partial<Record<string, string>>>>): Partial<Record<SettingsSection, string>> {
  return Object.entries(errors).reduce<Partial<Record<SettingsSection, string>>>((acc, [section, fieldErrors]) => {
    const message = fieldErrors && typeof fieldErrors === "object" ? Object.values(fieldErrors)[0] : undefined
    if (message) {
      acc[section as SettingsSection] = message
    }
    return acc
  }, {})
}

const billingActionConfig: Record<BillingAction, BillingActionConfig> = {
  upgradePlan: {
    endpoint: "/api/settings/billing/upgrade",
    successTitle: "Upgrade initialized",
    successDescription: "Upgrade flow is ready.",
    requiresConfirmation: true,
    confirmationTitle: "Confirm plan upgrade",
    confirmationDescription: "This can start a billing change. Continue?",
    body: { confirm: true },
  },
  manageSubscription: {
    endpoint: "/api/settings/billing/summary",
    method: "GET",
    successTitle: "Subscription status loaded",
    successDescription: "Latest subscription contract data refreshed.",
  },
  saveInvoiceDelivery: {
    endpoint: "/api/settings/actions/invoice-delivery",
    successTitle: "Invoice delivery synced",
    successDescription: "Invoice delivery contract data refreshed.",
    requiresConfirmation: true,
    confirmationTitle: "Confirm invoice delivery update",
    confirmationDescription: "Save invoice delivery details for upcoming invoices?",
    body: { confirm: true },
  },
  billingMethodSummary: {
    endpoint: "/api/settings/billing/summary",
    method: "GET",
    successTitle: "Billing method refreshed",
    successDescription: "Latest billing method summary loaded.",
  },
  usageMeters: {
    endpoint: "/api/settings/billing/usage",
    method: "GET",
    successTitle: "Usage refreshed",
    successDescription: "Latest usage meter values loaded.",
  },
  creditsBalance: {
    endpoint: "/api/settings/billing/summary",
    method: "GET",
    successTitle: "Credits refreshed",
    successDescription: "Latest credits balance loaded.",
  },
  referAndEarn: {
    endpoint: "/api/settings/billing/referrals",
    method: "GET",
    successTitle: "Referral details loaded",
    successDescription: "Refer & earn contract data refreshed.",
  },
}

async function fetchBillingCardsData() {
  const [summaryResponse, usageResponse, referralsResponse] = await Promise.all([
    fetch("/api/settings/billing/summary"),
    fetch("/api/settings/billing/usage"),
    fetch("/api/settings/billing/referrals"),
  ])

  const summaryPayload = await summaryResponse.json().catch(() => ({}))
  const usagePayload = await usageResponse.json().catch(() => ({}))
  const referralsPayload = await referralsResponse.json().catch(() => ({}))

  return {
    ...(summaryPayload?.data ?? {}),
    ...(usagePayload?.data ?? {}),
    ...(referralsPayload?.data ?? {}),
  } as Partial<SettingsData["billing"]>
}

export function SettingsShell({ compact = false, initialSection = "account", initialPanel }: SettingsShellProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<SettingsCategory>(initialSection)
  const [activePanel, setActivePanel] = useState<string>(() => getPanelForSection(initialSection, initialPanel))
  const [settingsData, setSettingsData] = useState<SettingsData>(defaultSettingsData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<SettingsSection, Partial<Record<string, string>>>>>({})
  const [settingsVersion, setSettingsVersion] = useState<number | null>(null)
  const [oneTimeApiKey, setOneTimeApiKey] = useState<string | null>(null)
  const [pendingBillingAction, setPendingBillingAction] = useState<BillingAction | null>(null)
  const [pendingSettingsDialog, setPendingSettingsDialog] = useState<PendingSettingsActionDialog | null>(null)
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false)
  const sectionContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const activeRailItem = useMemo(() => railItems.find((item) => item.key === activeSection) ?? railItems[0], [activeSection])
  const sectionErrors = useMemo(() => toSectionErrorMap(errors), [errors])

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
    const nextPanel = getPanelForSection(section, panel)
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
        const nextVersion = typeof payload?.meta?.settingsVersion === "number" ? payload.meta.settingsVersion : null
        setSettingsVersion(nextVersion)
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

        const nextBilling = await fetchBillingCardsData()
        setSettingsData((prev) => ({
          ...prev,
          billing: {
            ...prev.billing,
            ...nextBilling,
          },
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
    const sectionParam = normalizeSection(searchParams.get("section"))
    const panelParam = normalizePanel(searchParams.get("panel"))

    if (!sectionParam) {
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
    setErrors((prev) => ({ ...prev, [section]: {} }))

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildSectionPayload(section),
          ...(typeof settingsVersion === "number" ? { meta: { settingsVersion } } : {}),
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as ValidationErrorResponse & {
        data?: SettingsData
        meta?: { settingsVersion?: number }
      }

      if (!response.ok) {
        const validationErrors = payload?.error?.details?.validationErrors ?? {}
        const fallbackMessage = payload?.error?.message ?? "Failed to save changes. Please retry."
        setErrors((prev) => ({
          ...prev,
          [section]: Object.keys(validationErrors?.[section] ?? {}).length > 0
            ? validationErrors[section]
            : { _section: fallbackMessage },
          ...validationErrors,
        }))
        throw new Error(fallbackMessage)
      }

      const data = payload?.data ?? payload
      if (typeof payload?.meta?.settingsVersion === "number") {
        setSettingsVersion(payload.meta.settingsVersion)
      }
      setErrors((prev) => ({ ...prev, [section]: {} }))
      setSettingsData((prev) => ({
        ...prev,
        ...data,
        security: { ...prev.security, ...(data?.security ?? {}), newPassword: "" },
      }))

      toast({ title: "Settings saved", description: `${section} settings updated successfully.` })
    } catch {
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
    method: "GET" | "POST" | "DELETE" = "POST",
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

  const runBillingAction = async (action: BillingAction) => {
    const config = billingActionConfig[action]
    const data = await executeAction(config.endpoint, config.successTitle, config.successDescription, config.method ?? "POST", config.body)

    if (action === "saveInvoiceDelivery") {
      await saveSection("billing")
    }
    if (!data || typeof data !== "object") {
      throw new Error("Unable to complete billing action.")
    }

    setSettingsData((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        ...(data as Partial<SettingsData["billing"]>),
      },
    }))
  }

  const handleBillingAction = (action: BillingAction) => {
    const config = billingActionConfig[action]
    if (config.requiresConfirmation) {
      setPendingBillingAction(action)
      return
    }

    void runBillingAction(action)
  }

  const confirmPendingBillingAction = async () => {
    if (!pendingBillingAction) {
      return
    }

    const action = pendingBillingAction
    await runBillingAction(action)
    setPendingBillingAction(null)
  }

  const openSettingsActionDialog = (dialog: PendingSettingsActionDialog) => {
    setPendingSettingsDialog(dialog)
  }

  const isDisabled = isLoading || isSaving

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage grouped settings by account, workspace, security, billing, usage, API keys, and data controls.
        </p>
      </div>

      {!compact ? (
        <div className="lg:hidden">
          <Sheet open={isMobileRailOpen} onOpenChange={setIsMobileRailOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-start">
                {activeRailItem.label}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader>
                <SheetTitle>Settings sections</SheetTitle>
                <SheetDescription>Choose a settings group and panel.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {railItems.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant={item.key === activeSection ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => {
                      const panelKey = item.panels[0]?.key
                      setSectionAndPanel(item.key, panelKey)
                      setIsMobileRailOpen(false)
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : null}

      <div className={cn("grid gap-6", compact ? "grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)]")}>
        <aside className={cn("space-y-3", !compact && "hidden lg:block")}>
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
            <AccountSectionPanel
              data={settingsData}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={sectionErrors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
              onAction={(action) => {
                if (action === "revokeSessions") {
                  openSettingsActionDialog({
                    title: "Revoke all active sessions?",
                    description: "This signs out every active session on all devices.",
                    consequence: "You will be signed out everywhere and must sign in again on each device.",
                    confirmLabel: "Revoke sessions",
                    loadingLabel: "Revoking sessions...",
                    successMessage: "All sessions were revoked.",
                    onConfirm: async () => {
                      const data = await executeAction(
                        "/api/settings/actions/revoke-sessions",
                        "Sessions revoked",
                        "All sessions were revoked.",
                        "POST",
                        { confirm: true }
                      )
                      if (!data) {
                        throw new Error("Unable to revoke sessions.")
                      }
                    },
                  })
                }
              }}
            />
          ) : null}

          {activeSection === "workspace" ? (
            <WorkspaceSectionPanel
              data={settingsData}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={sectionErrors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
            />
          ) : null}

          {activeSection === "security" || activeSection === "api-keys" || activeSection === "data-controls" ? (
            <SecuritySectionPanel
              data={settingsData}
              oneTimeApiKey={oneTimeApiKey}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={sectionErrors}
              onFieldChange={onFieldChange}
              onSave={saveSection}
              onOneTimeApiKeyDismiss={() => setOneTimeApiKey(null)}
              onAction={(action) => {
                if (action === "regenerateApiKey") {
                  openSettingsActionDialog({
                    title: "Regenerate API key?",
                    description: "A new key will immediately replace the current key.",
                    consequence: "Any services using the existing API key will stop working until updated.",
                    confirmLabel: "Regenerate key",
                    loadingLabel: "Regenerating key...",
                    successMessage: "A new API key is now active.",
                    irreversibleWarning: "This cannot be undone. The previous API key will no longer be valid.",
                    onConfirm: async () => {
                      const data = await executeAction(
                        "/api/settings/actions/regenerate-api-key",
                        "API key regenerated",
                        "A new API key is now active.",
                        "POST",
                        { confirm: true }
                      )
                      if (!data) {
                        throw new Error("Unable to regenerate API key.")
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
                    },
                  })
                }
                if (action === "deleteApiKey") {
                  openSettingsActionDialog({
                    title: "Delete API key?",
                    description: "This removes API access for your account until a new key is generated.",
                    consequence: "Integrations and automations using this key will fail immediately.",
                    confirmLabel: "Delete key",
                    loadingLabel: "Deleting key...",
                    successMessage: "API key access removed.",
                    irreversibleWarning: "This is irreversible for the current key material.",
                    onConfirm: async () => {
                      const data = await executeAction(
                        "/api/settings/actions/delete-api-key",
                        "API key deleted",
                        "API key access removed.",
                        "DELETE",
                        { confirm: true }
                      )
                      if (!data) {
                        throw new Error("Unable to delete API key.")
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
                    },
                  })
                }
                if (action === "disable2FA") {
                  openSettingsActionDialog({
                    title: "Disable 2FA?",
                    description: "Turning off 2FA lowers account protection.",
                    consequence: "Future sign-ins will only require your password.",
                    confirmLabel: "Disable 2FA",
                    loadingLabel: "Disabling 2FA...",
                    successMessage: "Two-factor authentication disabled.",
                    onConfirm: async () => {
                      const data = await executeAction(
                        "/api/settings/actions/disable-2fa",
                        "2FA disabled",
                        "Two-factor authentication disabled.",
                        "POST",
                        { confirm: true }
                      )
                      if (!data) {
                        throw new Error("Unable to disable 2FA.")
                      }

                      onFieldChange("security", "twoFactorEnabled", false)
                    },
                  })
                }
              }}
            />
          ) : null}

          {activeSection === "billing" || activeSection === "usage" ? (
            <BillingSectionPanel
              data={settingsData}
              isDisabled={isDisabled}
              isSaving={isSaving}
              errors={sectionErrors}
              onFieldChange={onFieldChange}
              onAction={handleBillingAction}
            />
          ) : null}

        </main>
      </div>

      <ConfirmSettingsActionDialog
        open={Boolean(pendingBillingAction)}
        onOpenChange={(open) => (!open ? setPendingBillingAction(null) : undefined)}
        title={pendingBillingAction ? billingActionConfig[pendingBillingAction].confirmationTitle ?? "Confirm action" : "Confirm action"}
        description={
          pendingBillingAction
            ? billingActionConfig[pendingBillingAction].confirmationDescription ?? "Please confirm to continue."
            : "Please confirm to continue."
        }
        consequence="This action applies account billing changes and may affect the next invoice."
        confirmLabel="Continue"
        loadingLabel="Applying update..."
        successMessage="Billing action completed."
        destructive={false}
        onConfirm={async () => {
          await confirmPendingBillingAction()
        }}
      />

      <ConfirmSettingsActionDialog
        open={Boolean(pendingSettingsDialog)}
        onOpenChange={(open) => (!open ? setPendingSettingsDialog(null) : undefined)}
        title={pendingSettingsDialog?.title ?? "Confirm action"}
        description={pendingSettingsDialog?.description ?? "Please confirm to continue."}
        consequence={pendingSettingsDialog?.consequence ?? "This action changes account settings."}
        confirmLabel={pendingSettingsDialog?.confirmLabel ?? "Continue"}
        loadingLabel={pendingSettingsDialog?.loadingLabel ?? "Processing..."}
        successMessage={pendingSettingsDialog?.successMessage ?? "Action completed successfully."}
        irreversibleWarning={pendingSettingsDialog?.irreversibleWarning}
        destructive={pendingSettingsDialog?.destructive}
        onConfirm={async () => {
          if (!pendingSettingsDialog) {
            return
          }
          await pendingSettingsDialog.onConfirm()
        }}
      />
    </div>
  )
}
