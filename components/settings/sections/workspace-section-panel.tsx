import { PreferencesSettings } from "@/components/settings/sections/preferences-settings"
import type { SettingsSection } from "@/components/settings/types"
import type { FieldChangeHandler, SettingsSectionErrors } from "@/components/settings/sections/section-panel-types"

interface WorkspaceSectionPanelProps {
  data: Parameters<typeof PreferencesSettings>[0]["data"]
  isDisabled: boolean
  isSaving: boolean
  errors: SettingsSectionErrors
  onFieldChange: FieldChangeHandler
  onSave: (section: SettingsSection) => void
}

export function WorkspaceSectionPanel(props: WorkspaceSectionPanelProps) {
  return <PreferencesSettings {...props} />
}
