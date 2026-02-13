import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { SectionFeatureCard } from "@/components/settings/sections/section-feature-card"
import type { SettingsData, SettingsSection } from "@/components/settings/types"

interface PreferencesSettingsProps {
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
}

export function PreferencesSettings({ data, isDisabled, isSaving, errors, onFieldChange, onSave }: PreferencesSettingsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SectionFeatureCard
        panelId="notifications"
        title="Notifications"
        description="Choose which updates and announcements are sent to you."
        status="Configured"
        actionLabel={isSaving ? "Saving..." : "Save notifications"}
        disabled={isDisabled}
        onAction={() => onSave("notifications")}
      >
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Marketing emails</p>
            <p className="text-xs text-muted-foreground">Receive announcements and launch updates.</p>
          </div>
          <Switch
            checked={data.notifications.marketingEmailsEnabled}
            onCheckedChange={(checked) => onFieldChange("notifications", "marketingEmailsEnabled", checked)}
            disabled={isDisabled}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Product updates</p>
            <p className="text-xs text-muted-foreground">Get maintenance and release alerts.</p>
          </div>
          <Switch
            checked={data.notifications.productUpdatesEnabled}
            onCheckedChange={(checked) => onFieldChange("notifications", "productUpdatesEnabled", checked)}
            disabled={isDisabled}
          />
        </div>
        {errors.notifications ? <p className="text-sm text-destructive">{errors.notifications}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="appearance"
        title="Theme / Language"
        description="Set your interface defaults across devices."
        status="Configured"
        actionLabel={isSaving ? "Saving..." : "Save preferences"}
        disabled={isDisabled}
        onAction={() => onSave("preferences")}
      >
        <Select
          value={data.preferences.theme}
          onValueChange={(value) => onFieldChange("preferences", "theme", value as SettingsData["preferences"]["theme"])}
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

        <Select
          value={data.preferences.language}
          onValueChange={(value) =>
            onFieldChange("preferences", "language", value as SettingsData["preferences"]["language"])
          }
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
          </SelectContent>
        </Select>
        {errors.preferences ? <p className="text-sm text-destructive">{errors.preferences}</p> : null}
      </SectionFeatureCard>

      <SectionFeatureCard
        panelId="feedback"
        title="Feedback"
        description="Share workflow feedback to improve the product."
        status="Review"
        actionLabel={isSaving ? "Saving..." : "Submit feedback"}
        disabled={isDisabled}
        onAction={() => onSave("preferences")}
      >
        <Textarea
          value={data.preferences.feedbackNotes}
          onChange={(event) => onFieldChange("preferences", "feedbackNotes", event.target.value)}
          placeholder="Tell us what should improve in settings"
          disabled={isDisabled}
        />
      </SectionFeatureCard>
    </div>
  )
}
