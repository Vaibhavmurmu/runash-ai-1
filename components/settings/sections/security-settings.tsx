"use client"

import { useEffect, useState } from "react"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import type { SettingsData, SettingsSection } from "@/components/settings/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface SecuritySettingsProps {
  data: SettingsData
  oneTimeApiKey: string | null
  isDisabled: boolean
  isSaving: boolean
  errors: Partial<Record<SettingsSection, string>>
  onFieldChange: <TSection extends SettingsSection, TField extends keyof SettingsData[TSection]>(
    section: TSection,
    field: TField,
    value: SettingsData[TSection][TField]
  ) => void
  onSave: (section: SettingsSection) => void
  onOneTimeApiKeyDismiss: () => void
  onAction: (action: "regenerateApiKey" | "deleteApiKey" | "disable2FA") => void
}

type SecuritySession = {
  id: string
  mode: string
  scope: string
  deviceName: string | null
  lastSeenAt: string
}

type TrustedDevice = {
  deviceId: string
  deviceName: string | null
  trustedAt: string
}

export function SecuritySettings({
  data,
  oneTimeApiKey,
  isDisabled,
  isSaving,
  errors,
  onFieldChange,
  onSave,
  onOneTimeApiKeyDismiss,
  onAction,
}: SecuritySettingsProps) {
  const [sessions, setSessions] = useState<SecuritySession[]>([])
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, string>>({})

  const loadSecurityTables = async () => {
    const [sessionsResponse, devicesResponse] = await Promise.all([
      fetch("/api/settings/security/sessions", { cache: "no-store" }),
      fetch("/api/settings/security/devices", { cache: "no-store" }),
    ])

    if (sessionsResponse.ok) {
      const payload = (await sessionsResponse.json()) as { sessions?: SecuritySession[] }
      const nextSessions = Array.isArray(payload.sessions) ? payload.sessions : []
      setSessions(nextSessions)
      setScopeDrafts(Object.fromEntries(nextSessions.map((session) => [session.id, session.scope])))
    }

    if (devicesResponse.ok) {
      const payload = (await devicesResponse.json()) as { devices?: TrustedDevice[] }
      setDevices(Array.isArray(payload.devices) ? payload.devices : [])
    }
  }

  useEffect(() => {
    void loadSecurityTables()
  }, [])

  const updateScope = async (sessionId: string) => {
    const scope = scopeDrafts[sessionId]?.trim()
    if (!scope) {
      return
    }

    await fetch("/api/settings/security/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, scope }),
    })
    await loadSecurityTables()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard panelId="password" title="Data Encryption" description="Protect sensitive data at rest and in transit." status="Configured" actionLabel={isSaving ? "Saving..." : "Save security"} disabled={isDisabled} onAction={() => onSave("security")}>
        <div className="grid gap-2"><Label htmlFor="settings-password">New password</Label><Input id="settings-password" type="password" value={data.security.newPassword} onChange={(event) => onFieldChange("security", "newPassword", event.target.value)} disabled={isDisabled} /></div>
        {errors.security ? <p className="text-sm text-destructive">{errors.security}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard panelId="two-factor" title="2FA" description="Add additional verification to sign-ins." status={data.security.twoFactorEnabled ? "Configured" : "Recommended"} actionLabel={data.security.twoFactorEnabled ? "Disable 2FA" : "Save 2FA preference"} disabled={isDisabled} onAction={() => (data.security.twoFactorEnabled ? onAction("disable2FA") : onSave("security"))}>
        <div className="flex items-center justify-between rounded-md border p-3"><div><p className="text-sm font-medium">Two-factor authentication</p><p className="text-xs text-muted-foreground">Require a secondary factor when signing in.</p></div><Switch checked={data.security.twoFactorEnabled} onCheckedChange={(checked) => onFieldChange("security", "twoFactorEnabled", checked)} disabled={isDisabled} /></div>
      </SectionFeatureCard>

      <SectionFeatureCard panelId="privacy" title="Privacy Controls" description="Manage communication and profile visibility defaults." status="Review" actionLabel={isSaving ? "Saving..." : "Save notifications"} disabled={isDisabled} onAction={() => onSave("notifications")}/>

      <SectionFeatureCard panelId="api-security" title="API Security" description="Rotate and revoke integration credentials." status="Ready" actionLabel="Regenerate API key" disabled={isDisabled} onAction={() => onAction("regenerateApiKey")}>
        <div className="space-y-3 rounded-md border p-3">
          <div><p className="text-xs font-medium text-muted-foreground">Current key</p><p className="font-mono text-sm">{data.security.apiKeyMasked || "Not generated"}</p></div>
          {data.security.apiKeyLastRotatedAt ? <p className="text-xs text-muted-foreground">Last rotated: {new Date(data.security.apiKeyLastRotatedAt).toLocaleString()}</p> : null}
          {oneTimeApiKey ? (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">Copy this new key now. It will not be shown again.</p>
              <div className="flex flex-wrap items-center gap-2"><p className="max-w-full truncate font-mono text-sm text-amber-950">{oneTimeApiKey}</p><Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(oneTimeApiKey)} disabled={isDisabled}>Copy</Button><Button size="sm" variant="ghost" onClick={onOneTimeApiKeyDismiss} disabled={isDisabled}>Dismiss</Button></div>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2"><Button variant="destructive" onClick={() => onAction("deleteApiKey")} disabled={isDisabled}>Delete API key</Button></div>
      </SectionFeatureCard>

      <SectionFeatureCard panelId="authorization-scopes" title="Integration authorization scopes" description="View and edit scopes used by user-scoped integrations." status="Review" actionLabel="Refresh scopes" disabled={isDisabled} onAction={() => void loadSecurityTables()}>
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="grid gap-2 rounded-md border p-2">
              <p className="text-xs text-muted-foreground">{session.deviceName ?? "Unknown device"} · {session.mode} · Last seen {new Date(session.lastSeenAt).toLocaleString()}</p>
              <div className="flex gap-2"><Input value={scopeDrafts[session.id] ?? session.scope} onChange={(event) => setScopeDrafts((prev) => ({ ...prev, [session.id]: event.target.value }))} disabled={isDisabled}/><Button size="sm" onClick={() => void updateScope(session.id)} disabled={isDisabled}>Save scope</Button></div>
            </div>
          ))}
        </div>
      </SectionFeatureCard>

      <SectionFeatureCard panelId="security-devices" title="Trusted devices" description="Review trusted devices associated with your account sessions." status="Configured" actionLabel="Refresh devices" disabled={isDisabled} onAction={() => void loadSecurityTables()}>
        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device.deviceId} className="rounded-md border p-2 text-sm">
              <p className="font-medium">{device.deviceName ?? device.deviceId}</p>
              <p className="text-xs text-muted-foreground">Trusted {new Date(device.trustedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </SectionFeatureCard>
    </div>
  )
}
