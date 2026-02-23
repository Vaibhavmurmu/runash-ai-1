"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Settings, Globe, Lock, Eye, Save } from "lucide-react"
import type { LiveControlState, StreamVisibility } from "@/lib/types/stream-live-control"

interface StreamSettingsProps {
  streamId?: string | null
  streamTitle?: string
  streamDescription?: string
  onTitleChange?: (title: string) => void
  onDescriptionChange?: (description: string) => void
}

const defaultState: LiveControlState = {
  streamId: "",
  visibility: { defaultVisibility: "public", resolvedVisibility: "public" },
  scheduledMetadata: { trailerAssetId: null, scheduledAt: null, trailerTitle: "" },
  dualStream: { mode: "single", primaryOrientation: "horizontal", linkedStreamId: null, sharedChatEnabled: false },
  membersOnly: { enabled: false, transitionedAt: null, reason: "" },
  moderation: {
    pinnedMessageId: null,
    qna: { status: "idle", selectedQuestionId: null, startedAt: null, endedAt: null },
    polls: [],
  },
  updatedAt: new Date().toISOString(),
}

export default function StreamSettings({
  streamId,
  streamTitle = "",
  streamDescription = "",
  onTitleChange,
  onDescriptionChange,
}: StreamSettingsProps) {
  const [state, setState] = useState<LiveControlState>(defaultState)
  const [title, setTitle] = useState(streamTitle)
  const [description, setDescription] = useState(streamDescription)

  useEffect(() => {
    setTitle(streamTitle)
    setDescription(streamDescription)
  }, [streamTitle, streamDescription])

  useEffect(() => {
    if (!streamId) return
    const load = async () => {
      const response = await fetch(`/api/dashboard/streams/live-control/${streamId}`)
      if (!response.ok) return
      const payload = (await response.json()) as { state: LiveControlState }
      setState(payload.state)
    }
    void load()
  }, [streamId])

  const persist = async (next: Partial<LiveControlState>) => {
    if (!streamId) return
    const response = await fetch(`/api/dashboard/streams/live-control/${streamId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
    if (!response.ok) return
    const payload = (await response.json()) as { state: LiveControlState }
    setState(payload.state)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Settings className="h-5 w-5 mr-2 text-orange-500" />
        <h3 className="text-lg font-medium">Live Control Settings</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stream-title">Stream Title</Label>
          <Input
            id="stream-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              onTitleChange?.(e.target.value)
            }}
            placeholder="Enter a title for your stream"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-description">Description</Label>
          <Textarea
            id="stream-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              onDescriptionChange?.(e.target.value)
            }}
            placeholder="Describe your stream"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-visibility">Visibility (resolved: {state.visibility.resolvedVisibility})</Label>
          <Select
            value={state.visibility.explicitVisibility ?? "default"}
            onValueChange={(value) =>
              void persist({
                visibility: {
                  ...state.visibility,
                  explicitVisibility: value === "default" ? undefined : (value as StreamVisibility),
                },
              })
            }
          >
            <SelectTrigger id="stream-visibility">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Age-based default</SelectItem>
              <SelectItem value="public"><div className="flex items-center"><Globe className="h-4 w-4 mr-2" />Public</div></SelectItem>
              <SelectItem value="unlisted"><div className="flex items-center"><Eye className="h-4 w-4 mr-2" />Unlisted</div></SelectItem>
              <SelectItem value="private"><div className="flex items-center"><Lock className="h-4 w-4 mr-2" />Private</div></SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="min-age">Minimum Viewer Age</Label>
          <Input
            id="min-age"
            type="number"
            min={0}
            max={120}
            value={state.visibility.minimumViewerAge ?? ""}
            onChange={(e) =>
              void persist({
                visibility: {
                  ...state.visibility,
                  minimumViewerAge: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trailer-id">Trailer Asset ID</Label>
          <Input
            id="trailer-id"
            value={state.scheduledMetadata.trailerAssetId ?? ""}
            onChange={(e) => setState((prev) => ({ ...prev, scheduledMetadata: { ...prev.scheduledMetadata, trailerAssetId: e.target.value } }))}
            placeholder="asset_XXXXXXXX"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="dual-stream" className="cursor-pointer">Enable dual stream + shared chat</Label>
          <Switch
            id="dual-stream"
            checked={state.dualStream.mode === "dual"}
            onCheckedChange={(checked) => void persist({ dualStream: { ...state.dualStream, mode: checked ? "dual" : "single", sharedChatEnabled: checked } })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="members-only" className="cursor-pointer">Members-only mode</Label>
          <Switch
            id="members-only"
            checked={state.membersOnly.enabled}
            onCheckedChange={(checked) =>
              streamId &&
              fetch(`/api/dashboard/streams/live-control/${streamId}/actions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "members_only_transition", enabled: checked, reason: "studio-toggle" }),
              })
                .then((response) => (response.ok ? response.json() : null))
                .then((payload) => payload?.state && setState(payload.state))
            }
          />
        </div>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90 text-white"
        onClick={() => void persist({ scheduledMetadata: state.scheduledMetadata })}
      >
        <Save className="mr-2 h-4 w-4" />
        Save Settings
      </Button>
    </div>
  )
}
