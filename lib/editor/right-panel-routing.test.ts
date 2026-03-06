import test from "node:test"
import assert from "node:assert/strict"
import { resolveRightPanelTab, updateTabPanelState } from "@/components/editor/right-panel"
import { DEFAULT_EDIT_PANEL_STATE } from "@/components/editor/panels/edit-panel"
import { DEFAULT_LAYERS_PANEL_STATE } from "@/components/editor/panels/layers-panel"

test("resolveRightPanelTab falls back to generate for unknown ids", () => {
  assert.equal(resolveRightPanelTab("generate"), "generate")
  assert.equal(resolveRightPanelTab("edit"), "edit")
  assert.equal(resolveRightPanelTab("not-a-tab"), "generate")
  assert.equal(resolveRightPanelTab(undefined), "generate")
})

test("tab panel state is retained while switching tabs", () => {
  const initial = {
    edit: DEFAULT_EDIT_PANEL_STATE,
    layers: DEFAULT_LAYERS_PANEL_STATE,
  }

  const editUpdated = updateTabPanelState(initial, "edit", {
    ...initial.edit,
    trimStart: "2.5",
    trackVolume: "73",
  })

  const layersUpdated = updateTabPanelState(editUpdated, "layers", [
    ...editUpdated.layers.slice(1),
    editUpdated.layers[0],
  ])

  assert.equal(layersUpdated.edit.trimStart, "2.5")
  assert.equal(layersUpdated.edit.trackVolume, "73")
  assert.equal(layersUpdated.layers[0].id, "layer-text")
})
