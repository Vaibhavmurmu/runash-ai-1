import { SettingsShell } from "@/components/settings/settings-shell"
import type { SettingsRouteTarget } from "@/app/settings/route-targets"

export function SettingsSectionPage({ section, panel }: SettingsRouteTarget) {
  return <SettingsShell initialSection={section} initialPanel={panel} />
}
