import { SecuritySettings } from "@/components/settings/sections/security-settings"
import type { SettingsSection } from "@/components/settings/types"
import type { FieldChangeHandler, SettingsSectionErrors } from "@/components/settings/sections/section-panel-types"

interface SecuritySectionPanelProps {
  data: Parameters<typeof SecuritySettings>[0]["data"]
  oneTimeApiKey: string | null
  isDisabled: boolean
  isSaving: boolean
  errors: SettingsSectionErrors
  onFieldChange: FieldChangeHandler
  onSave: (section: SettingsSection) => void
  onOneTimeApiKeyDismiss: () => void
  onAction: Parameters<typeof SecuritySettings>[0]["onAction"]
}

export function SecuritySectionPanel(props: SecuritySectionPanelProps) {
  return <SecuritySettings {...props} />
}
