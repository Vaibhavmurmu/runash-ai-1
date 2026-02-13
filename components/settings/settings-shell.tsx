"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

type SettingsTab = "account" | "profile" | "security" | "notifications" | "preferences" | "billing"

type SettingsData = {
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

interface SettingsShellProps {
  compact?: boolean
}

interface ConfirmActionDialogProps {
  triggerLabel: string
  title: string
  description: string
  consequenceText: string
  confirmLabel: string
  destructive?: boolean
  disabled?: boolean
  onConfirm: () => Promise<void>
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
  },
  billing: {
    invoiceEmail: "",
    autoRechargeEnabled: false,
  },
}

function ConfirmActionDialog({
  triggerLabel,
  title,
  description,
  consequenceText,
  confirmLabel,
  destructive = false,
  disabled = false,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState("")

  const handleConfirm = async () => {
    setIsPending(true)
    setError("")

    try {
      await onConfirm()
      setOpen(false)
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Action failed. Please retry.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          setOpen(nextOpen)
          if (!nextOpen) {
            setError("")
          }
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant={destructive ? "destructive" : "outline"} disabled={disabled || isPending}>
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm text-destructive">{consequenceText}</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {isPending ? <p className="text-xs text-muted-foreground">Processing request...</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Working..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function SettingsShell({ compact = false }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account")
  const [settingsData, setSettingsData] = useState<SettingsData>(defaultSettingsData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<SettingsTab, string>>>({})
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      setErrors({})

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
          account: {
            ...prev.account,
            ...(data?.account ?? {}),
          },
          profile: {
            ...prev.profile,
            ...(data?.profile ?? {}),
          },
          security: {
            ...prev.security,
            ...(data?.security ?? {}),
            newPassword: "",
          },
          notifications: {
            ...prev.notifications,
            ...(data?.notifications ?? {}),
          },
          preferences: {
            ...prev.preferences,
            ...(data?.preferences ?? {}),
          },
          billing: {
            ...prev.billing,
            ...(data?.billing ?? {}),
          },
        }))
      } catch {
        toast({
          title: "Failed to load settings",
          description: "Please refresh and try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [toast])

  const saveSection = async (section: SettingsTab) => {
    const previous = settingsData
    const nextSectionData = settingsData[section]

    setIsSaving(true)
    setErrors((prev) => ({ ...prev, [section]: "" }))

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: nextSectionData }),
      })

      if (!response.ok) {
        throw new Error("Failed to save settings")
      }

      const payload = await response.json()
      const data = payload?.data ?? payload

      setSettingsData((prev) => ({
        ...prev,
        ...data,
        security: {
          ...prev.security,
          ...(data?.security ?? {}),
          newPassword: "",
        },
      }))

      toast({
        title: "Settings saved",
        description: `${section.charAt(0).toUpperCase()}${section.slice(1)} settings updated successfully.`,
      })
    } catch {
      setSettingsData(previous)
      setErrors((prev) => ({ ...prev, [section]: "Failed to save changes. Please retry." }))
      toast({
        title: "Save failed",
        description: `Could not save ${section} settings. Changes were rolled back.`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isDisabled = isLoading || isSaving

  const executeSensitiveAction = async (
    endpoint: string,
    successTitle: string,
    successDescription: string,
    method: "POST" | "DELETE" = "POST"
  ) => {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      let errorMessage = "Action failed. Please retry."

      try {
        const payload = await response.json()
        errorMessage = payload?.error ?? payload?.message ?? errorMessage
      } catch {
        // Keep fallback message when error payload is not JSON.
      }

      throw new Error(errorMessage)
    }

    toast({
      title: successTitle,
      description: successDescription,
    })
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, profile, security, notifications, preferences, and billing.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="space-y-4">
        <div className={compact ? "overflow-x-auto" : ""}>
          <TabsList className={`grid w-full ${compact ? "grid-cols-2 gap-2 h-auto min-w-[560px]" : "grid-cols-6"}`}>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Update your login and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={settingsData.account.email}
                  onChange={(event) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      account: { ...prev.account, email: event.target.value },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  type="tel"
                  placeholder="+1 (555) 555-5555"
                  value={settingsData.account.phone}
                  onChange={(event) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      account: { ...prev.account, phone: event.target.value },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              {errors.account ? <p className="text-sm text-destructive">{errors.account}</p> : null}
              <Button onClick={() => saveSection("account")} disabled={isDisabled}>
                {isSaving && activeTab === "account" ? "Saving..." : "Save account changes"}
              </Button>
              <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
                <div>
                  <p className="text-sm font-medium">Danger zone</p>
                  <p className="text-xs text-muted-foreground">Permanent account actions require explicit confirmation.</p>
                </div>
                <ConfirmActionDialog
                  triggerLabel="Delete account"
                  title="Delete your account?"
                  description="This will immediately remove access to your workspace and account settings."
                  consequenceText="This action cannot be undone. All personal settings and profile data are permanently deleted."
                  confirmLabel="Yes, delete account"
                  destructive
                  disabled={isDisabled}
                  onConfirm={() =>
                    executeSensitiveAction(
                      "/api/settings/actions/delete-account",
                      "Account deletion requested",
                      "Your account deletion request has been submitted.",
                      "DELETE"
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Control how your profile appears across RunAsh.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-display-name">Display name</Label>
                <Input
                  id="settings-display-name"
                  value={settingsData.profile.displayName}
                  onChange={(event) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, displayName: event.target.value },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-bio">Bio</Label>
                <Input
                  id="settings-bio"
                  placeholder="Tell your audience about your channel"
                  value={settingsData.profile.bio}
                  onChange={(event) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      profile: { ...prev.profile, bio: event.target.value },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              {errors.profile ? <p className="text-sm text-destructive">{errors.profile}</p> : null}
              <Button onClick={() => saveSection("profile")} disabled={isDisabled}>
                {isSaving && activeTab === "profile" ? "Saving..." : "Save profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Protect your account and sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-password">New password</Label>
                <Input
                  id="settings-password"
                  type="password"
                  placeholder="••••••••"
                  value={settingsData.security.newPassword}
                  onChange={(event) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      security: { ...prev.security, newPassword: event.target.value },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Add an additional verification step at sign in.</p>
                </div>
                <Switch
                  checked={settingsData.security.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      security: { ...prev.security, twoFactorEnabled: checked },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              {errors.security ? <p className="text-sm text-destructive">{errors.security}</p> : null}
              <Button onClick={() => saveSection("security")} disabled={isDisabled}>
                {isSaving && activeTab === "security" ? "Saving..." : "Update security settings"}
              </Button>
              <div className="space-y-3 rounded-md border p-4">
                <p className="text-sm font-medium">Sensitive security actions</p>
                <div className="flex flex-wrap gap-2">
                  <ConfirmActionDialog
                    triggerLabel="Revoke all sessions"
                    title="Revoke all active sessions?"
                    description="Sign out all active devices and require new authentication on next request."
                    consequenceText="All active tokens are revoked immediately, including trusted sessions on other devices."
                    confirmLabel="Revoke sessions"
                    destructive
                    disabled={isDisabled}
                    onConfirm={() =>
                      executeSensitiveAction(
                        "/api/settings/actions/revoke-sessions",
                        "Sessions revoked",
                        "All active sessions have been invalidated."
                      )
                    }
                  />
                  <ConfirmActionDialog
                    triggerLabel="Regenerate API key"
                    title="Regenerate API key?"
                    description="Create a new API key and rotate credentials used by automations and integrations."
                    consequenceText="The current API key is invalidated immediately. Integrations must be updated to avoid failures."
                    confirmLabel="Regenerate key"
                    disabled={isDisabled}
                    onConfirm={() =>
                      executeSensitiveAction(
                        "/api/settings/actions/regenerate-api-key",
                        "API key regenerated",
                        "A new API key is ready. Update your integrations now."
                      )
                    }
                  />
                  <ConfirmActionDialog
                    triggerLabel="Delete API key"
                    title="Delete API key?"
                    description="Remove all API key access for external tools and integrations."
                    consequenceText="This action cannot be undone. Existing API clients will stop working until a new key is generated."
                    confirmLabel="Delete API key"
                    destructive
                    disabled={isDisabled}
                    onConfirm={() =>
                      executeSensitiveAction(
                        "/api/settings/actions/delete-api-key",
                        "API key deleted",
                        "API key access has been removed.",
                        "DELETE"
                      )
                    }
                  />
                  <ConfirmActionDialog
                    triggerLabel="Disable 2FA"
                    title="Disable two-factor authentication?"
                    description="Turn off your second verification factor for future sign-ins."
                    consequenceText="Your account security is reduced immediately and sign-ins will no longer require a second factor."
                    confirmLabel="Disable 2FA"
                    destructive
                    disabled={isDisabled || !settingsData.security.twoFactorEnabled}
                    onConfirm={async () => {
                      await executeSensitiveAction(
                        "/api/settings/actions/disable-2fa",
                        "Two-factor disabled",
                        "2FA has been disabled for this account."
                      )
                      setSettingsData((prev) => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          twoFactorEnabled: false,
                        },
                      }))
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose which updates you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Marketing emails</p>
                  <p className="text-xs text-muted-foreground">Receive updates about product announcements.</p>
                </div>
                <Switch
                  checked={settingsData.notifications.marketingEmailsEnabled}
                  onCheckedChange={(checked) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, marketingEmailsEnabled: checked },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Product updates</p>
                  <p className="text-xs text-muted-foreground">Get release and maintenance notifications.</p>
                </div>
                <Switch
                  checked={settingsData.notifications.productUpdatesEnabled}
                  onCheckedChange={(checked) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, productUpdatesEnabled: checked },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              {errors.notifications ? <p className="text-sm text-destructive">{errors.notifications}</p> : null}
              <Button onClick={() => saveSection("notifications")} disabled={isDisabled}>
                {isSaving && activeTab === "notifications" ? "Saving..." : "Save notifications"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Set defaults for your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Default theme</Label>
                <Select
                  value={settingsData.preferences.theme}
                  onValueChange={(value) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      preferences: { ...prev.preferences, theme: value as SettingsData["preferences"]["theme"] },
                    }))
                  }
                  disabled={isDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.preferences ? <p className="text-sm text-destructive">{errors.preferences}</p> : null}
              <Button onClick={() => saveSection("preferences")} disabled={isDisabled}>
                {isSaving && activeTab === "preferences" ? "Saving..." : "Save preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage invoice and automatic recharge defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-invoice-email">Invoice email</Label>
                <Input
                  id="settings-invoice-email"
                  type="email"
                  value={settingsData.billing.invoiceEmail}
                  onChange={(event) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, invoiceEmail: event.target.value },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Auto recharge</p>
                  <p className="text-xs text-muted-foreground">Automatically recharge billing balance when low.</p>
                </div>
                <Switch
                  checked={settingsData.billing.autoRechargeEnabled}
                  onCheckedChange={(checked) =>
                    setSettingsData((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, autoRechargeEnabled: checked },
                    }))
                  }
                  disabled={isDisabled}
                />
              </div>
              {errors.billing ? <p className="text-sm text-destructive">{errors.billing}</p> : null}
              <Button onClick={() => saveSection("billing")} disabled={isDisabled}>
                {isSaving && activeTab === "billing" ? "Saving..." : "Save billing settings"}
              </Button>
              <div className="space-y-3 rounded-md border p-4">
                <p className="text-sm font-medium">Plan management</p>
                <div className="flex flex-wrap gap-2">
                  <ConfirmActionDialog
                    triggerLabel="Cancel subscription"
                    title="Cancel subscription renewal?"
                    description="Stop automatic renewal for your current paid subscription."
                    consequenceText="Paid features remain until period end, then billing stops and access may be limited."
                    confirmLabel="Cancel subscription"
                    destructive
                    disabled={isDisabled}
                    onConfirm={() =>
                      executeSensitiveAction(
                        "/api/settings/actions/cancel-subscription",
                        "Subscription canceled",
                        "Your subscription will end at the current billing period."
                      )
                    }
                  />
                  <ConfirmActionDialog
                    triggerLabel="Downgrade plan"
                    title="Downgrade to a lower plan?"
                    description="Move your workspace to a plan with fewer included capabilities."
                    consequenceText="Some premium features are removed at the next renewal and usage limits are reduced."
                    confirmLabel="Downgrade plan"
                    disabled={isDisabled}
                    onConfirm={() =>
                      executeSensitiveAction(
                        "/api/settings/actions/downgrade-plan",
                        "Downgrade scheduled",
                        "Plan downgrade is scheduled for the next billing cycle."
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
