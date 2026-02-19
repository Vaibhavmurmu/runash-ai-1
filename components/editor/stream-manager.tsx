"use client"

import { Radio, Play, Pause, Users, Eye, TrendingUp, Trash2, Plus, Activity, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useStreamManager } from "@/hooks/use-stream-manager"

export default function StreamManager() {
  const { streams, selectedStream, setSelectedStream, stats, isLoading, isPolling, isRealtimeConnected, error, refresh, actions } =
    useStreamManager()

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const getStatusColor = (status: "idle" | "streaming" | "paused") => {
    switch (status) {
      case "streaming":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      case "paused":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const selectedStreamData = streams.find((stream) => stream.id === selectedStream)

  return (
    <div className="w-full lg:w-96 bg-card border-l border-border flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="streams" className="w-full h-full flex flex-col">
        <div className="border-b border-border px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Radio className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Stream Manager</h3>
                <p className="text-xs text-muted-foreground">{isRealtimeConnected ? "Realtime metrics connected" : "Polling metrics fallback"}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void refresh()} aria-label="Refresh stream data">
              <RefreshCcw className={`w-4 h-4 ${isPolling ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <TabsList className="w-full rounded-none bg-transparent">
            <TabsTrigger value="streams" className="flex-1">
              Channels
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1">
              Stats
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="streams" className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading stream channels…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!isLoading && streams.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">No stream channels yet. Add your first stream to get started.</p>
          )}

          <div className="space-y-2 mb-4">
            {streams.map((stream) => (
              <button
                key={stream.id}
                onClick={() => setSelectedStream(stream.id)}
                className={`w-full p-3 rounded-lg border transition-all text-left ${
                  selectedStream === stream.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{stream.name}</h4>
                      <Badge
                        variant={stream.status === "streaming" ? "default" : "secondary"}
                        className={`text-xs whitespace-nowrap ${getStatusColor(stream.status)}`}
                      >
                        {stream.status === "streaming" ? "LIVE" : stream.status === "paused" ? "Paused" : "Idle"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{stream.platform}</p>
                  </div>

                  {stream.status === "streaming" && (
                    <div className="flex items-center gap-1 text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>

                {stream.status === "streaming" && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {stream.viewers.toLocaleString()} viewers
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Activity className="w-3 h-3" />
                      {stream.bitrate} kbps
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button onClick={() => void actions.addStream()} variant="outline" className="w-full gap-2 bg-transparent">
            <Plus className="w-4 h-4" />
            Add Stream Channel
          </Button>
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedStreamData && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">{selectedStreamData.name}</h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Viewers
                    </span>
                    <span className="font-semibold text-foreground">{selectedStreamData.viewers.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Bitrate
                    </span>
                    <span className="font-semibold text-foreground">{selectedStreamData.bitrate} kbps</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      FPS
                    </span>
                    <span className="font-semibold text-foreground">{selectedStreamData.fps}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-semibold text-foreground">{formatTime(selectedStreamData.duration)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <h4 className="font-semibold text-sm">Overall Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Viewers</span>
                    <span className="font-semibold">{stats.totalViewers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg Bitrate</span>
                    <span className="font-semibold">{stats.avgBitrate} kbps</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dropped Frames</span>
                    <span className="font-semibold text-orange-500">{stats.droppedFrames}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 space-y-4">
          {selectedStreamData && (
            <>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">{selectedStreamData.name} Settings</h4>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground block">Bitrate (kbps)</label>
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="500"
                    defaultValue={selectedStreamData.bitrate}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-2">
                <Button onClick={() => void actions.startStream(selectedStreamData.id)} className="gap-2" variant="default">
                  <Play className="w-4 h-4" />
                  Start
                </Button>
                <Button onClick={() => void actions.pauseStream(selectedStreamData.id)} className="gap-2" variant="secondary">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button onClick={() => void actions.stopStream(selectedStreamData.id)} className="gap-2" variant="destructive">
                  <Pause className="w-4 h-4" />
                  Stop
                </Button>
                <Button onClick={() => void actions.removeStream(selectedStreamData.id)} variant="outline" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
