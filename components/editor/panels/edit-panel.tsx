"use client"

import EditControls, { type EditControlsProps } from "./edit-controls"

export type EditPanelState = EditControlsProps["state"]
export type EditPanelProps = EditControlsProps

export { DEFAULT_EDIT_PANEL_STATE } from "./edit-controls"

export default function EditPanel({ state, onStateChange }: EditPanelProps) {
  return (
    <div className="space-y-5 p-4">
      <EditControls state={state} onStateChange={onStateChange} />
    </div>
  )
}
