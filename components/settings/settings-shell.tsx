"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SettingsTab = "account" | "profile" | "security" | "preferences"

interface SettingsShellProps {
  compact?: boolean
}

export function SettingsShell({ compact = false }: SettingsShellProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account")
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [marketingEmailsEnabled, setMarketingEmailsEnabled] = useState(true)
  const [productUpdatesEnabled, setProductUpdatesEnabled] = useState(true)

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, profile, security, and preferences.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className="space-y-4">
        <TabsList className={`grid w-full ${compact ? "grid-cols-2 gap-2 h-auto" : "grid-cols-4"}`}>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Update your login and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-email">Email</Label>
                <Input id="settings-email" type="email" defaultValue="you@runash.ai" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input id="settings-phone" type="tel" placeholder="+1 (555) 555-5555" />
              </div>
              <Button>Save account changes</Button>
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
                <Input id="settings-display-name" defaultValue="RunAsh Creator" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-bio">Bio</Label>
                <Input id="settings-bio" placeholder="Tell your audience about your channel" />
              </div>
              <Button>Save profile</Button>
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
                <Input id="settings-password" type="password" placeholder="••••••••" />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Add an additional verification step at sign in.</p>
                </div>
                <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
              </div>
              <Button>Update security settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Set notifications and defaults for your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Default theme</Label>
                <Select defaultValue="system">
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
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Marketing emails</p>
                  <p className="text-xs text-muted-foreground">Receive updates about product announcements.</p>
                </div>
                <Switch checked={marketingEmailsEnabled} onCheckedChange={setMarketingEmailsEnabled} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Product updates</p>
                  <p className="text-xs text-muted-foreground">Get release and maintenance notifications.</p>
                </div>
                <Switch checked={productUpdatesEnabled} onCheckedChange={setProductUpdatesEnabled} />
              </div>
              <Button>Save preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
