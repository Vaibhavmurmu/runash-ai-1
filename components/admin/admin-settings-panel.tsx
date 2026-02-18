"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Settings, RefreshCw, Shield, Mail, Key, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SettingsData {
  [category: string]: {
    [key: string]: any
  }
}

export function AdminSettingsPanel() {
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories] = useState(["auth", "security", "email", "features"])
  const { toast } = useToast()

  const fetchSettings = async () => {
    try {
      const promises = categories.map(async (category) => {
        const response = await fetch(`/api/admin/settings/${category}`)
        if (response.ok) {
          const data = await response.json()
          return { category, data: data.data }
        }
        return { category, data: {} }
      })

      const results = await Promise.all(promises)
      const newSettings: SettingsData = {}

      results.forEach(({ category, data }) => {
        newSettings[category] = data
      })

      setSettings(newSettings)
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (category: string, key: string, value: any, type: string) => {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key, value, type }),
      })

      if (response.ok) {
        setSettings((prev) => ({
          ...prev,
          [category]: {
            ...prev[category],
            [key]: value,
          },
        }))

        toast({
          title: "Success",
          description: "Setting updated successfully",
        })
      } else {
        throw new Error("Failed to update setting")
      }
    } catch (error) {
      console.error("Failed to update setting:", error)
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Admin Settings
          </h1>
          <p className="text-muted-foreground mt-2">Configure system-wide settings and preferences</p>
        </div>
        <Button variant="outline" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="auth" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>Configure password requirements and validation rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password_min_length">Minimum Password Length</Label>
                  <Input
                    id="password_min_length"
                    type="number"
                    value={settings.auth?.password_min_length || 8}
                    onChange={(e) =>
                      updateSetting("auth", "password_min_length", Number.parseInt(e.target.value), "number")
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                  <Input
                    id="max_login_attempts"
                    type="number"
                    value={settings.auth?.max_login_attempts || 5}
                    onChange={(e) =>
                      updateSetting("auth", "max_login_attempts", Number.parseInt(e.target.value), "number")
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Password Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_uppercase">Require Uppercase</Label>
                    <Switch
                      id="require_uppercase"
                      checked={settings.auth?.password_require_uppercase || false}
                      onCheckedChange={(checked) =>
                        updateSetting("auth", "password_require_uppercase", checked, "boolean")
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_lowercase">Require Lowercase</Label>
                    <Switch
                      id="require_lowercase"
                      checked={settings.auth?.password_require_lowercase || false}
                      onCheckedChange={(checked) =>
                        updateSetting("auth", "password_require_lowercase", checked, "boolean")
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_numbers">Require Numbers</Label>
                    <Switch
                      id="require_numbers"
                      checked={settings.auth?.password_require_numbers || false}
                      onCheckedChange={(checked) =>
                        updateSetting("auth", "password_require_numbers", checked, "boolean")
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_symbols">Require Symbols</Label>
                    <Switch
                      id="require_symbols"
                      checked={settings.auth?.password_require_symbols || false}
                      onCheckedChange={(checked) =>
                        updateSetting("auth", "password_require_symbols", checked, "boolean")
                      }
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Methods</CardTitle>
              <CardDescription>Enable or disable authentication methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable_2fa">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Allow users to enable 2FA</p>
                </div>
                <Switch
                  id="enable_2fa"
                  checked={settings.security?.enable_2fa || false}
                  onCheckedChange={(checked) => updateSetting("security", "enable_2fa", checked, "boolean")}
                  disabled={saving}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable_magic_links">Magic Links</Label>
                  <p className="text-sm text-muted-foreground">Enable passwordless login via email</p>
                </div>
                <Switch
                  id="enable_magic_links"
                  checked={settings.security?.enable_magic_links || false}
                  onCheckedChange={(checked) => updateSetting("security", "enable_magic_links", checked, "boolean")}
                  disabled={saving}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable_passkeys">Passkeys</Label>
                  <p className="text-sm text-muted-foreground">Enable WebAuthn passkey authentication</p>
                </div>
                <Switch
                  id="enable_passkeys"
                  checked={settings.security?.enable_passkeys || false}
                  onCheckedChange={(checked) => updateSetting("security", "enable_passkeys", checked, "boolean")}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure email settings and templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Email settings are configured via environment variables</p>
                <Badge variant="outline" className="mt-2">
                  EMAIL_PROVIDER, EMAIL_FROM, SMTP_HOST/SMTP_USER/SMTP_PASSWORD or RESEND_API_KEY
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable application features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Feature flags will be available in future updates</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
