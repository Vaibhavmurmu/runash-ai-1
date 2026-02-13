import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import type { SettingsData, SettingsSection } from "@/components/settings/types"

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

export function AccountSettings({ data, isDisabled, isSaving, errors, onFieldChange, onSave, onAction }: AccountSettingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard
        title="Profile"
        description="Control public profile details across RunAsh."
        status="Configured"
        actionLabel={isSaving ? "Saving..." : "Save profile"}
        disabled={isDisabled}
        onAction={() => onSave("profile")}
      >
        <div className="grid gap-2">
          <Label htmlFor="settings-display-name">Display name</Label>
          <Input
            id="settings-display-name"
            value={data.profile.displayName}
            onChange={(event) => onFieldChange("profile", "displayName", event.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settings-bio">Bio</Label>
          <Input
            id="settings-bio"
            value={data.profile.bio}
            onChange={(event) => onFieldChange("profile", "bio", event.target.value)}
            disabled={isDisabled}
          />
        </div>
        {errors.profile ? <p className="text-sm text-destructive">{errors.profile}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        title="Authentication"
        description="Manage login and identity details."
        status="Ready"
        actionLabel={isSaving ? "Saving..." : "Save account"}
        disabled={isDisabled}
        onAction={() => onSave("account")}
      >
        <div className="grid gap-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input
            id="settings-email"
            type="email"
            value={data.account.email}
            onChange={(event) => onFieldChange("account", "email", event.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="settings-phone">Phone</Label>
          <Input
            id="settings-phone"
            value={data.account.phone}
            onChange={(event) => onFieldChange("account", "phone", event.target.value)}
            disabled={isDisabled}
          />
        </div>
        {errors.account ? <p className="text-sm text-destructive">{errors.account}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        title="Authorization"
        description="Review role and permission mapping for your workspace."
        status="Review"
        actionLabel="Review access"
        disabled={isDisabled}
        onAction={() => onSave("account")}
      />

      <SectionFeatureCard
        title="Sessions"
        description="Revoke active sessions across all browsers and devices."
        status="Recommended"
        actionLabel="Revoke sessions"
        disabled={isDisabled}
        onAction={() => onAction("revokeSessions")}
      />

      <SectionFeatureCard
        title="Devices"
        description="Track trusted devices and sign out stale devices quickly."
        status="Review"
        actionLabel="Refresh devices"
        disabled={isDisabled}
        onAction={() => onAction("revokeSessions")}
      >
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Trusted sessions required</p>
            <p className="text-xs text-muted-foreground">Require re-authentication for unknown devices.</p>
          </div>
          <Switch checked={data.security.twoFactorEnabled} disabled />
        </div>
      </SectionFeatureCard>
    </div>
  )
}
