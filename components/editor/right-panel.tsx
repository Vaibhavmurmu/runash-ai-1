"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { SlidersHorizontal } from "lucide-react"
import { isRightPanelTabId, type RightPanelTabId } from "./panel-tabs"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import type { VideoGenerationRequest } from "@/lib/editor/video-models/types"
import type { EditorProject, EditorSegment, EditorTimeline } from "@/lib/editor/domain"
import GeneratePanel from "./panels/generate-panel"
import EditPanel, { DEFAULT_EDIT_PANEL_STATE, type EditPanelState } from "./panels/edit-panel"
import LayersPanel, { DEFAULT_LAYERS_PANEL_STATE, type LayerItem } from "./panels/layers-panel"
import StreamPanel from "./panels/stream-panel"
import { EditorPanelContextProvider } from "./panels/editor-panel-context"

interface RightPanelProps {
  selectedModel: string
  onModelChange: (model: string) => void
  generationConfig: VideoGenerationRequest
  validationErrors: Record<string, string>
  onGenerationConfigChange: (config: VideoGenerationRequest) => void
  activeTab?: string
  project?: EditorProject | null
  activeTimeline?: EditorTimeline
  selectedSegment?: EditorSegment
  playheadSeconds?: number
}

interface SharedPanelProps {
  selectedModel: string
  onModelChange: (model: string) => void
  generationConfig: VideoGenerationRequest
  validationErrors: Record<string, string>
  onGenerationConfigChange: (config: VideoGenerationRequest) => void
}

export function resolveRightPanelTab(activeTab?: string): RightPanelTabId {
  return activeTab && isRightPanelTabId(activeTab) ? activeTab : "generate"
}

export interface TabPanelState {
  edit: EditPanelState
  layers: LayerItem[]
}

export function updateTabPanelState<K extends keyof TabPanelState>(
  state: TabPanelState,
  tabId: K,
  value: TabPanelState[K],
): TabPanelState {
  return {
    ...state,
    [tabId]: value,
  }
}

const DEFAULT_TAB_PANEL_STATE: TabPanelState = {
  edit: DEFAULT_EDIT_PANEL_STATE,
  layers: DEFAULT_LAYERS_PANEL_STATE,
}

export function renderPanelByTab(
  tabId: RightPanelTabId,
  sharedPanelProps: SharedPanelProps,
  tabPanelState: TabPanelState,
  setTabPanelState: Dispatch<SetStateAction<TabPanelState>>,
): JSX.Element {
  const panelMap: Record<RightPanelTabId, () => JSX.Element> = {
    generate: () => <GeneratePanel {...sharedPanelProps} />,
    edit: () => (
      <EditPanel
        state={tabPanelState.edit}
        onStateChange={(next) => setTabPanelState((prev) => updateTabPanelState(prev, "edit", next))}
      />
    ),
    layers: () => (
      <LayersPanel
        layers={tabPanelState.layers}
        onLayersChange={(next) => setTabPanelState((prev) => updateTabPanelState(prev, "layers", next))}
      />
    ),
    stream: () => <StreamPanel />,
  }

  return panelMap[tabId]()
}

export default function RightPanel({
  selectedModel,
  onModelChange,
  generationConfig,
  validationErrors,
  onGenerationConfigChange,
  activeTab,
  project,
  activeTimeline,
  selectedSegment,
  playheadSeconds = 0,
}: RightPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)
  const [tabPanelState, setTabPanelState] = useState<TabPanelState>(DEFAULT_TAB_PANEL_STATE)

  const resolvedTab = resolveRightPanelTab(activeTab)

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)")
    const sync = () => setIsNarrowViewport(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])

  const sharedPanelProps = useMemo(
    () => ({
      selectedModel,
      onModelChange,
      generationConfig,
      validationErrors,
      onGenerationConfigChange,
    }),
    [selectedModel, onModelChange, generationConfig, validationErrors, onGenerationConfigChange],
  )

  const panelContent = (
    <EditorPanelContextProvider
      value={{
        project,
        activeTimeline,
        selectedSegment,
        playheadSeconds,
      }}
    >
      {renderPanelByTab(resolvedTab, sharedPanelProps, tabPanelState, setTabPanelState)}
    </EditorPanelContextProvider>
  )

  return (
    <>
      <aside className="hidden w-80 overflow-y-auto border-l border-border bg-card lg:block xl:w-96 2xl:w-[28rem]">{panelContent}</aside>

      {isNarrowViewport && (
        <div className="fixed bottom-36 right-4 z-30">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="h-12 w-12 rounded-full shadow-lg" aria-label="Open model and settings panel">
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[92vw] max-w-md p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle>Project controls</SheetTitle>
                <SheetDescription>Models, generation settings, and stream controls.</SheetDescription>
              </SheetHeader>
              <div className="h-[calc(100%-4.5rem)] overflow-y-auto">{panelContent}</div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  )
}
