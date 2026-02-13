import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import type { SettingsData, SettingsSection } from "@/components/settings/types"

interface SecuritySettingsProps {
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
  onAction: (action: "regenerateApiKey" | "deleteApiKey" | "disable2FA") => void
}

export function SecuritySettings({ data, isDisabled, isSaving, errors, onFieldChange, onSave, onAction }: SecuritySettingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard
        title="Data Encryption"
        description="Protect sensitive data at rest and in transit."
        status="Configured"
        actionLabel={isSaving ? "Saving..." : "Save security"}
        disabled={isDisabled}
        onAction={() => onSave("security")}
      >
        <div className="grid gap-2">
          <Label htmlFor="settings-password">New password</Label>
          <Input
            id="settings-password"
            type="password"
            value={data.security.newPassword}
            onChange={(event) => onFieldChange("security", "newPassword", event.target.value)}
            disabled={isDisabled}
          />
        </div>
        {errors.security ? <p className="text-sm text-destructive">{errors.security}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        title="2FA"
        description="Add additional verification to sign-ins."
        status={data.security.twoFactorEnabled ? "Configured" : "Recommended"}
        actionLabel={data.security.twoFactorEnabled ? "Disable 2FA" : "Save 2FA preference"}
        disabled={isDisabled}
        onAction={() => (data.security.twoFactorEnabled ? onAction("disable2FA") : onSave("security"))}
      >
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Two-factor authentication</p>
            <p className="text-xs text-muted-foreground">Require a secondary factor when signing in.</p>
          </div>
          <Switch
            checked={data.security.twoFactorEnabled}
            onCheckedChange={(checked) => onFieldChange("security", "twoFactorEnabled", checked)}
            disabled={isDisabled}
          />
        </div>
      </SectionFeatureCard>

      <SectionFeatureCard
        title="Privacy Controls"
        description="Manage communication and profile visibility defaults."
        status="Review"
        actionLabel={isSaving ? "Saving..." : "Save notifications"}
        disabled={isDisabled}
        onAction={() => onSave("notifications")}
      />

      <SectionFeatureCard
        title="API Security"
        description="Rotate and revoke integration credentials."
        status="Ready"
        actionLabel="Regenerate API key"
        disabled={isDisabled}
        onAction={() => onAction("regenerateApiKey")}
      >
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => onAction("deleteApiKey")} disabled={isDisabled}>
            Delete API key
          </Button>
        </div>
      </SectionFeatureCard>
    </div>
  )
}
