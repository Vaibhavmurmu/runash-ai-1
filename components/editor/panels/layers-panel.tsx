"use client"

import LayersControls, {
  deriveLayerItemsFromTimeline,
  moveLayer,
  toggleLayerVisibility,
  type LayerItem,
} from "./layers-controls"
import { useEditorPanelContext } from "./editor-panel-context"

export { deriveLayerItemsFromTimeline, moveLayer, toggleLayerVisibility }
export type { LayerItem }

export default function LayersPanel() {
  const { activeTimeline, project, onTimelineChange } = useEditorPanelContext()

  return (
    <div className="space-y-5 p-4">
      <LayersControls
        timeline={activeTimeline}
        projectName={project?.name}
        timelineName={activeTimeline?.name}
        onTimelineChange={onTimelineChange}
      />
    </div>
  )
}
