export const RIGHT_PANEL_TABS = [
  { id: "generate", label: "Generate" },
  { id: "edit", label: "Edit" },
  { id: "layers", label: "Layers" },
  { id: "stream", label: "Stream" },
] as const

export type RightPanelTabId = (typeof RIGHT_PANEL_TABS)[number]["id"]

export function isRightPanelTabId(tabId: string): tabId is RightPanelTabId {
  return RIGHT_PANEL_TABS.some((tab) => tab.id === tabId)
}
