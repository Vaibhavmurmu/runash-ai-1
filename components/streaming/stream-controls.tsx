"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, Share2, RepeatIcon as Record, CircleStopIcon as Stop } from "lucide-react"
import type { LiveControlState, StreamManualFallbackOverride } from "@/lib/types/stream-live-control"
import type { StreamMetrics } from "@/lib/streaming-service"

interface StreamControlsProps {
  streamId?: string | null
  isStreaming: boolean
  isRecording: boolean
  metrics: Pick<StreamMetrics, "bitrate" | "fps" | "latency">
  onToggleStream: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

const defaultNetwork = {
  lowLatencyMode: false,
  autoQualityFallbackOnWeakNetwork: true,
  dataSaverPreset: "balanced",
  manualFallbackOverride: "auto",
} as const

export default function StreamControls({
  streamId,
  isStreaming,
  isRecording,
  metrics,
  onToggleStream,
  onStartRecording,
  onStopRecording,
}: StreamControlsProps) {
  const [network, setNetwork] = useState(defaultNetwork)

  useEffect(() => {
    if (!streamId) return
    const load = async () => {
      const response = await fetch(`/api/dashboard/streams/live-control/${streamId}`)
      if (!response.ok) return
      const payload = (await response.json()) as { state: LiveControlState }
      setNetwork(payload.state.network)
    }
    void load()
  }, [streamId])

  const persistNetwork = async (manualFallbackOverride: StreamManualFallbackOverride) => {
    if (!streamId) return
    const next = { ...network, manualFallbackOverride }
    setNetwork(next)

    const response = await fetch(`/api/dashboard/streams/live-control/${streamId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: next }),
    })

    if (!response.ok) return

    const payload = (await response.json()) as { state: LiveControlState }
    setNetwork(payload.state.network)
  }

  const networkMode = useMemo(() => {
    if (network.manualFallbackOverride === "force_fallback") return "Forced fallback"
    if (network.manualFallbackOverride === "force_standard") return "Forced standard"
    if (network.autoQualityFallbackOnWeakNetwork) return "Adaptive auto"
    return "Manual standard"
  }, [network.autoQualityFallbackOnWeakNetwork, network.manualFallbackOverride])

  return (
    <div className="flex flex-col space-y-4">
      {isStreaming && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Bitrate: {Math.round(metrics.bitrate)} kbps</Badge>
          <Badge variant="secondary">FPS: {Math.round(metrics.fps)}</Badge>
          <Badge variant="secondary">Latency: {Math.round(metrics.latency)} ms</Badge>
        </div>
      )}

      <div className="space-y-2 rounded-md border border-orange-100 p-3 dark:border-orange-900/50">
        <Label className="text-xs text-muted-foreground">Current network mode</Label>
        <p className="text-sm font-medium">{networkMode}</p>
        <div className="space-y-1">
          <Label htmlFor="manual-fallback-override" className="text-xs">Manual fallback override</Label>
          <Select
            value={network.manualFallbackOverride}
            onValueChange={(value) => void persistNetwork(value as StreamManualFallbackOverride)}
          >
            <SelectTrigger id="manual-fallback-override">
              <SelectValue placeholder="Select override" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (recommended)</SelectItem>
              <SelectItem value="force_standard">Force standard quality</SelectItem>
              <SelectItem value="force_fallback">Force fallback quality</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={onToggleStream}
        className={
          isStreaming
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90 text-white"
        }
        size="lg"
      >
        {isStreaming ? (
          <>
            <Pause className="mr-2 h-4 w-4" />
            End Stream
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Go Live
          </>
        )}
      </Button>

      {isStreaming && (
        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          variant="outline"
          className={isRecording ? "border-red-200 text-red-600" : "border-orange-200 dark:border-orange-800"}
        >
          {isRecording ? (
            <>
              <Stop className="mr-2 h-4 w-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Record className="mr-2 h-4 w-4" />
              Record Stream
            </>
          )}
        </Button>
      )}

      <Button variant="outline" className="border-orange-200 dark:border-orange-800">
        <Share2 className="mr-2 h-4 w-4" />
        Share Stream
      </Button>
    </div>
  )
}
