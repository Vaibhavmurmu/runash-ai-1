"use client"

import { type RefObject, useEffect, useRef, useState } from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { DestructiveActionDialog } from "@/components/settings/destructive-action-dialog"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import type { AttachmentMetadata, SettingsData, SettingsSection } from "@/components/settings/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AccountSettingsProps {
  data: SettingsData
  isDisabled: boolean
  isSaving: boolean
  errors: Partial<Record<SettingsSection, string>>
  onFieldChange: <TSection extends SettingsSection, TField extends keyof SettingsData[TSection]>(
    section: TSection,
    field: TField,
    value: SettingsData[TSection][TField]
  ) => void
  onSave: (section: SettingsSection) => void
  onAction: (action: "revokeSessions") => void
}

type ProfileAttachmentKey = "avatarAttachment" | "bannerAttachment"

type UploadState = {
  progress: number
  error: string
  activeSlot: ProfileAttachmentKey | null
}

type AuthSessionOption = {
  id: string
  scope: string
  mode: string
  lastSeenAt: string
  deviceName: string | null
}

type TrustedDeviceOption = {
  deviceId: string
  deviceName: string | null
  lastSeenAt: string
  trustedAt: string
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
}

function buildAttachment(file: File): AttachmentMetadata {
  return {
    url: URL.createObjectURL(file),
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }
}

export function AccountSettings({ data, isDisabled, isSaving, errors, onFieldChange, onSave, onAction }: AccountSettingsProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ progress: 0, error: "", activeSlot: null })
  const [authSessions, setAuthSessions] = useState<AuthSessionOption[]>([])
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceOption[]>([])
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [deviceToRevoke, setDeviceToRevoke] = useState<string | null>(null)

  const loadSecurityData = async () => {
    const [sessionsResponse, devicesResponse] = await Promise.all([
      fetch("/api/settings/security/sessions", { cache: "no-store" }),
      fetch("/api/settings/security/devices", { cache: "no-store" }),
    ])

    if (sessionsResponse.ok) {
      const payload = (await sessionsResponse.json()) as { sessions?: AuthSessionOption[] }
      setAuthSessions(Array.isArray(payload.sessions) ? payload.sessions : [])
    }

    if (devicesResponse.ok) {
      const payload = (await devicesResponse.json()) as { devices?: TrustedDeviceOption[] }
      setTrustedDevices(Array.isArray(payload.devices) ? payload.devices : [])
    }
  }

  useEffect(() => {
    void loadSecurityData()
  }, [])

  const revokeSession = async () => {
    if (!sessionToRevoke) return
    await fetch("/api/settings/security/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionToRevoke }),
    })
    setSessionToRevoke(null)
    await loadSecurityData()
  }

  const revokeDevice = async () => {
    if (!deviceToRevoke) return
    await fetch("/api/settings/security/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceToRevoke }),
    })
    setDeviceToRevoke(null)
    await loadSecurityData()
  }

  const handleProfileUpload = async (slot: ProfileAttachmentKey, file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setUploadState({ progress: 0, error: "Only image files are allowed for avatar and banner.", activeSlot: slot })
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadState({ progress: 0, error: "Image must be smaller than 5MB.", activeSlot: slot })
      return
    }

    setUploadState({ progress: 10, error: "", activeSlot: slot })
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        setUploadState((prev) => {
          const nextProgress = Math.min(prev.progress + 20, 95)
          if (nextProgress >= 95) {
            clearInterval(timer)
            resolve()
          }
          return { ...prev, progress: nextProgress }
        })
      }, 80)
    })

    onFieldChange("profile", slot, buildAttachment(file))
    setUploadState({ progress: 100, error: "", activeSlot: slot })
    setTimeout(() => setUploadState((prev) => (prev.activeSlot === slot ? { progress: 0, error: "", activeSlot: null } : prev)), 450)
  }

  const clearAttachment = (slot: ProfileAttachmentKey) => {
    const currentAttachment = data.profile[slot]
    if (currentAttachment?.url?.startsWith("blob:")) URL.revokeObjectURL(currentAttachment.url)
    onFieldChange("profile", slot, null)
  }

  const renderUploadSlot = (slot: ProfileAttachmentKey, title: string, description: string, inputRef: RefObject<HTMLInputElement | null>) => {
    const attachment = data.profile[slot]
    const isUploading = uploadState.activeSlot === slot && uploadState.progress > 0 && uploadState.progress < 100
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {attachment ? (
          <div className="overflow-hidden rounded-md border bg-muted/20">
            <img src={attachment.url} alt={`${title} preview`} className="h-24 w-full object-cover" />
            <div className="flex items-center justify-between p-2 text-xs text-muted-foreground">
              <span className="truncate">{attachment.filename}</span>
              <span>{formatFileSize(attachment.size)}</span>
            </div>
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">No image uploaded</div>
        )}
        {isUploading ? <p className="text-xs text-muted-foreground">Uploading… {uploadState.progress}%</p> : null}
        <div className="flex gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={isDisabled} onChange={(event) => { void handleProfileUpload(slot, event.target.files?.[0]); event.currentTarget.value = "" }} />
          <Button type="button" variant="outline" disabled={isDisabled} onClick={() => inputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />{attachment ? "Replace" : "Upload"}</Button>
          {attachment ? <Button type="button" variant="ghost" disabled={isDisabled} onClick={() => clearAttachment(slot)}><Trash2 className="mr-2 h-4 w-4" />Remove</Button> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard panelId="profile" title="Profile" description="Control public profile details across RunAsh." status="Configured" actionLabel={isSaving ? "Saving..." : "Save profile"} disabled={isDisabled} onAction={() => onSave("profile")}>
        <div className="grid gap-2"><Label htmlFor="settings-display-name">Display name</Label><Input id="settings-display-name" value={data.profile.displayName} onChange={(event) => onFieldChange("profile", "displayName", event.target.value)} disabled={isDisabled} /></div>
        <div className="grid gap-2"><Label htmlFor="settings-bio">Bio</Label><Input id="settings-bio" value={data.profile.bio} onChange={(event) => onFieldChange("profile", "bio", event.target.value)} disabled={isDisabled} /></div>
        {renderUploadSlot("avatarAttachment", "Avatar", "Square profile image used in workspace and account areas.", avatarInputRef)}
        {renderUploadSlot("bannerAttachment", "Banner", "Wide profile banner shown on your public page.", bannerInputRef)}
        {errors.profile ? <p className="text-sm text-destructive">{errors.profile}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard panelId="authentication" title="Authentication" description="Manage login and identity details." status="Ready" actionLabel={isSaving ? "Saving..." : "Save account"} disabled={isDisabled} onAction={() => onSave("account")}>
        <div className="grid gap-2"><Label htmlFor="settings-email">Email</Label><Input id="settings-email" type="email" value={data.account.email} onChange={(event) => onFieldChange("account", "email", event.target.value)} disabled={isDisabled} /></div>
        <div className="grid gap-2"><Label htmlFor="settings-phone">Phone</Label><Input id="settings-phone" value={data.account.phone} onChange={(event) => onFieldChange("account", "phone", event.target.value)} disabled={isDisabled} /></div>
        {errors.account ? <p className="text-sm text-destructive">{errors.account}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard panelId="sessions" title="Sessions" description="Revoke active sessions across all browsers and devices." status="Recommended" actionLabel="Revoke sessions" disabled={isDisabled} onAction={() => onAction("revokeSessions")}>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr><th className="p-2">Device</th><th className="p-2">Mode</th><th className="p-2">Scope</th><th className="p-2">Last seen</th><th className="p-2" /></tr></thead>
            <tbody>
              {authSessions.map((session) => (
                <tr key={session.id} className="border-t"><td className="p-2">{session.deviceName ?? "Unknown"}</td><td className="p-2">{session.mode}</td><td className="p-2">{session.scope}</td><td className="p-2">{new Date(session.lastSeenAt).toLocaleString()}</td><td className="p-2 text-right"><Button variant="destructive" size="sm" onClick={() => setSessionToRevoke(session.id)} disabled={isDisabled}>Revoke</Button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFeatureCard>

      <SectionFeatureCard panelId="devices" title="Devices" description="Track trusted devices and sign out stale devices quickly." status="Review" actionLabel="Refresh devices" disabled={isDisabled} onAction={() => void loadSecurityData()}>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr><th className="p-2">Device</th><th className="p-2">Trusted at</th><th className="p-2">Last seen</th><th className="p-2" /></tr></thead>
            <tbody>
              {trustedDevices.map((device) => (
                <tr key={device.deviceId} className="border-t"><td className="p-2">{device.deviceName ?? device.deviceId}</td><td className="p-2">{new Date(device.trustedAt).toLocaleString()}</td><td className="p-2">{new Date(device.lastSeenAt).toLocaleString()}</td><td className="p-2 text-right"><Button variant="destructive" size="sm" onClick={() => setDeviceToRevoke(device.deviceId)} disabled={isDisabled}>Untrust</Button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionFeatureCard>

      <DestructiveActionDialog open={Boolean(sessionToRevoke)} onOpenChange={(open) => (!open ? setSessionToRevoke(null) : undefined)} title="Revoke this session?" description="This session will be signed out immediately." confirmLabel="Revoke session" onConfirm={() => void revokeSession()} />
      <DestructiveActionDialog open={Boolean(deviceToRevoke)} onOpenChange={(open) => (!open ? setDeviceToRevoke(null) : undefined)} title="Untrust this device?" description="The device will require re-authentication on next sensitive action." confirmLabel="Untrust device" onConfirm={() => void revokeDevice()} />
    </div>
  )
}
