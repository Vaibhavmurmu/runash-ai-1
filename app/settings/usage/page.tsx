import { SettingsSectionPage } from "@/app/settings/_components/settings-section-page"
import { settingsRouteTargets } from "@/app/settings/route-targets"

export default function SettingsUsagePage() {
  return <SettingsSectionPage {...settingsRouteTargets.usage} />
}
