"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
