"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ScreenShare,
  StopCircle,
  Settings,
  MessageSquare,
  Layers,
  Share2,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Maximize,
  Minimize,
  PanelLeft,
  PanelRight,
  Eye,
  Heart,
  Sparkles,
  Activity,
  Users,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { StreamHealth } from "@/components/analytics/stream-health"
import { ThemeToggle } from "@/components/theme-toggle"
import ScreenShareWithAnnotations from "./screen-share-with-annotations"
import VirtualBackgrounds from "./virtual-backgrounds"
import MultiPlatformStreaming from "./multi-platform-streaming"
import AlertDisplay from "./alerts/alert-display"
import StreamChat from "./stream-chat"
import { MultiHostManager } from "./multi-host/multi-host-manager"
import PollQuizManager from "@/components/grocery/live-shopping/poll-quiz-manager"
import {
  type MediaAIPipelineSettings,
  defaultMediaAIPipelineSettings,
  MediaAIPipeline,
} from "@/services/media-ai-pipeline"
import {
  createStreamSession,
  endStreamSession,
  getStreamHealthTelemetry,
  getStreamLiveMetrics,
  reportStreamNetworkMetrics,
  startStreamSession,
} from "@/lib/stream-session-contract"
import { saveStudioConsent } from "@/lib/streams-studio-pro-client"

type StreamStage = "permissions" | "preview" | "live"
type DevicePermissionStatus = "idle" | "granted" | "denied" | "error"

export function EnhancedStreamingStudio() {
  const pipeline = useMemo(() => new MediaAIPipeline(), [])
  const [streamSessionId, setStreamSessionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [streamDuration, setStreamDuration] = useState("00:00:00")
  const [viewerCount, setViewerCount] = useState(0)
  const [streamHealth, setStreamHealth] = useState<"excellent" | "good" | "fair" | "poor">("good")
  const [activePlatforms, setActivePlatforms] = useState<string[]>([])
  const [selectedLayout, setSelectedLayout] = useState("standard")
  const [streamQuality, setStreamQuality] = useState(85)
  const [aiSettings, setAiSettings] = useState<MediaAIPipelineSettings>(defaultMediaAIPipelineSettings)
  const [stage, setStage] = useState<StreamStage>("permissions")
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [consentPreferences, setConsentPreferences] = useState({
    allowMic: true,
    allowCamera: true,
    allowScreenShare: true,
    allowRecording: false,
    preferredLanguage: "en" as "en" | "hi",
  })
  const [deviceStatus, setDeviceStatus] = useState<Record<"mic" | "camera" | "screen", DevicePermissionStatus>>({
    mic: "idle",
    camera: "idle",
    screen: "idle",
  })
  const [selectedDeviceIds, setSelectedDeviceIds] = useState({ mic: "", camera: "" })
  const [isMetadataHydrated, setIsMetadataHydrated] = useState(false)
  const router = useRouter()
  const studioStreamId = "studio-default"

  useEffect(() => {
    setAiSettings(pipeline.restoreSettings())
  }, [pipeline])

  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = window.localStorage.getItem("runash.stream.session.metadata")
    if (!raw) {
      setIsMetadataHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(raw) as {
        aiSettings?: MediaAIPipelineSettings
        streamQuality?: number
        selectedLayout?: string
        isMuted?: boolean
        isCameraOn?: boolean
        selectedDeviceIds?: { mic?: string; camera?: string }
        consentPreferences?: typeof consentPreferences
      }

      if (parsed.aiSettings) setAiSettings(parsed.aiSettings)
      if (typeof parsed.streamQuality === "number") setStreamQuality(parsed.streamQuality)
      if (parsed.selectedLayout) setSelectedLayout(parsed.selectedLayout)
      if (typeof parsed.isMuted === "boolean") setIsMuted(parsed.isMuted)
      if (typeof parsed.isCameraOn === "boolean") setIsCameraOn(parsed.isCameraOn)
      if (parsed.selectedDeviceIds) {
        setSelectedDeviceIds({ mic: parsed.selectedDeviceIds.mic ?? "", camera: parsed.selectedDeviceIds.camera ?? "" })
      }
      if (parsed.consentPreferences) {
        setConsentPreferences((prev) => ({ ...prev, ...parsed.consentPreferences }))
      }
    } catch {
      // no-op on corrupted local storage payload
    } finally {
      setIsMetadataHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isMetadataHydrated || typeof window === "undefined") return
    pipeline.persistSettings(aiSettings)
    window.localStorage.setItem(
      "runash.stream.session.metadata",
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        aiSettings,
        streamQuality,
        selectedLayout,
        isMuted,
        isCameraOn,
        selectedDeviceIds,
        consentPreferences,
      }),
    )
  }, [
    aiSettings,
    streamQuality,
    selectedLayout,
    pipeline,
    isMetadataHydrated,
    isMuted,
    isCameraOn,
    selectedDeviceIds,
    consentPreferences,
  ])

  // Simulated real-time data
  const [realtimeStats, setRealtimeStats] = useState({
    viewers: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  })

  const [healthMetrics, setHealthMetrics] = useState({
    bitrateKbps: 0,
    rttMs: 0,
    packetLossPct: 0,
    droppedFrames: 0,
    reconnects: 0,
  })

  useEffect(() => {
    let alive = true
    const bootstrapSession = async () => {
      if (streamSessionId) return
      try {
        const created = await createStreamSession({ title: "Streaming Studio Session", platform: "custom" })
        if (alive) {
          setStreamSessionId(String(created.session.id))
          setIsStreaming(created.session.status === "live")
        }
      } catch {
        toast({ title: "Session Error", description: "Unable to initialize stream session.", variant: "destructive" })
      }
    }
    void bootstrapSession()
    return () => {
      alive = false
    }
  }, [streamSessionId])

  const syncConsent = async (payload = consentPreferences) => {
    if (!streamSessionId) return
    try {
      await saveStudioConsent(streamSessionId, payload)
    } catch {
      toast({ title: "Consent Sync Failed", description: "Could not save consent settings.", variant: "destructive" })
    }
  }

  const requestMediaPermission = async (kind: "mic" | "camera") => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setDeviceStatus((prev) => ({ ...prev, [kind]: "error" }))
        return
      }

      const constraint = kind === "mic"
        ? { audio: selectedDeviceIds.mic ? { deviceId: { exact: selectedDeviceIds.mic } } : true, video: false }
        : { audio: false, video: selectedDeviceIds.camera ? { deviceId: { exact: selectedDeviceIds.camera } } : true }

      const stream = await navigator.mediaDevices.getUserMedia(constraint)
      const track = kind === "mic" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
      const deviceId = track?.getSettings().deviceId
      if (deviceId) {
        setSelectedDeviceIds((prev) => ({ ...prev, [kind]: deviceId }))
      }
      stream.getTracks().forEach((trackItem) => trackItem.stop())
      setDeviceStatus((prev) => ({ ...prev, [kind]: "granted" }))
    } catch (error) {
      setDeviceStatus((prev) => ({ ...prev, [kind]: error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error" }))
    }
  }

  const requestScreenSharePermission = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setDeviceStatus((prev) => ({ ...prev, screen: "error" }))
        return
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      stream.getTracks().forEach((track) => track.stop())
      setDeviceStatus((prev) => ({ ...prev, screen: "granted" }))
    } catch (error) {
      setDeviceStatus((prev) => ({ ...prev, screen: error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error" }))
    }
  }

  const areRequiredPermissionsGranted =
    (!consentPreferences.allowMic || deviceStatus.mic === "granted") &&
    (!consentPreferences.allowCamera || deviceStatus.camera === "granted") &&
    (!consentPreferences.allowScreenShare || deviceStatus.screen === "granted")

  const canStartLive = areRequiredPermissionsGranted && isPreviewVisible && stage !== "permissions"

  useEffect(() => {
    if (!streamSessionId) return
    const interval = setInterval(async () => {
      try {
        if (isStreaming) {
          const sampledAt = new Date().toISOString()
          const seconds = Math.floor(Date.now() / 1000)
          await reportStreamNetworkMetrics(streamSessionId, {
            bitrateKbps: 4200 + (seconds % 5) * 220,
            rttMs: 85 + (seconds % 6) * 14,
            packetLossPct: Number(((seconds % 4) * 0.35).toFixed(2)),
            droppedFrames: seconds % 9,
            reconnects: seconds % 120 === 0 ? 1 : 0,
            sampledAt,
          })
        }

        const [{ metrics, network }, { telemetry }] = await Promise.all([
          getStreamLiveMetrics(streamSessionId),
          getStreamHealthTelemetry(streamSessionId),
        ])

        const hours = Math.floor(metrics.durationSeconds / 3600)
        const minutes = Math.floor((metrics.durationSeconds % 3600) / 60)
        const secs = metrics.durationSeconds % 60
        setStreamDuration(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
        )
        setViewerCount(metrics.viewers)
        setRealtimeStats({
          viewers: metrics.viewers,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
        })
        setStreamHealth(telemetry.status)
        const latestNetwork = network.latest
        setHealthMetrics({
          bitrateKbps: latestNetwork?.bitrateKbps ?? telemetry.bitrateKbps,
          rttMs: latestNetwork?.rttMs ?? telemetry.rttMs,
          packetLossPct: latestNetwork?.packetLossPct ?? telemetry.packetLossPct,
          droppedFrames: latestNetwork?.droppedFrames ?? telemetry.droppedFrames,
          reconnects: latestNetwork?.reconnects ?? telemetry.reconnects,
        })
      } catch {
        // no-op polling failure
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isStreaming, streamSessionId])

  const handleToggleStream = async () => {
    if (!streamSessionId) return
    const previous = isStreaming
    setIsStreaming(!previous)
    if (!isStreaming) {
      if (!canStartLive) {
        setIsStreaming(previous)
        toast({
          title: "Setup Required",
          description: "Grant required permissions and open preview before going live.",
          variant: "destructive",
        })
        return
      }
      // Starting stream
      try {
        await syncConsent()
        await startStreamSession(streamSessionId)
        setStage("live")
        toast({
          title: "Stream Started",
          description: "Your stream is now live on your selected platforms.",
          variant: "default",
        })
        setActivePlatforms(["twitch"])
      } catch {
        setIsStreaming(previous)
        toast({ title: "Start Failed", description: "Could not start stream session.", variant: "destructive" })
      }
    } else {
      try {
        await endStreamSession(streamSessionId)
        toast({
          title: "Stream Ended",
          description: "Your stream has ended. View your analytics in the dashboard.",
          variant: "default",
        })
        setIsRecording(false)
        setActivePlatforms([])
        setStage("preview")
      } catch {
        setIsStreaming(previous)
        toast({ title: "End Failed", description: "Could not end stream session.", variant: "destructive" })
      }
    }
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    toast({
      title: "Recording Started",
      description: "Your stream is now being recorded.",
      variant: "default",
    })
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    toast({
      title: "Recording Stopped",
      description: "Your recording has been saved.",
      variant: "default",
    })
  }

  const handlePlatformChange = (platforms: string[]) => {
    setActivePlatforms(platforms)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case "excellent":
        return "text-green-500"
      case "good":
        return "text-emerald-500"
      case "fair":
        return "text-amber-500"
      case "poor":
        return "text-red-500"
      default:
        return "text-green-500"
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="hover:bg-orange-100 dark:hover:bg-orange-900/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
              Streaming Studio
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {isStreaming ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span>Live</span>
                  </>
                ) : (
                  <span>Offline</span>
                )}
              </div>
              {isStreaming && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{streamDuration}</span>
                  </div>
                  <Separator orientation="vertical" className="h-3" />
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{viewerCount}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`${streamHealth === "excellent" || streamHealth === "good" ? "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400" : "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"}`}
                  onClick={() => {
                    toast({
                      title: "Stream Health",
                      description: `Your stream health is ${streamHealth.toUpperCase()}. ${streamHealth === "excellent" || streamHealth === "good" ? "Everything looks good!" : "Check your connection."}`,
                      variant: "default",
                    })
                  }}
                >
                  {streamHealth === "excellent" || streamHealth === "good" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Stream Health: <span className={getHealthColor(streamHealth)}>{streamHealth.toUpperCase()}</span>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Stream Settings</SheetTitle>
                <SheetDescription>Configure your stream settings and preferences.</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Video Quality</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality: {streamQuality}%</span>
                    <span className="text-xs text-muted-foreground">{aiSettings.qualityMode}</span>
                  </div>
                  <Slider
                    value={[streamQuality]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setStreamQuality(value[0])}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Stream Layout</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["standard", "side-by-side", "picture-in-picture"].map((layout) => (
                      <div
                        key={layout}
                        className={`p-2 border rounded-md cursor-pointer transition-all ${selectedLayout === layout ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : "hover:border-orange-200 dark:hover:border-orange-800"}`}
                        onClick={() => setSelectedLayout(layout)}
                      >
                        <div className="aspect-video bg-muted rounded-sm flex items-center justify-center">
                          <span className="text-xs text-muted-foreground capitalize">{layout.replace(/-/g, " ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Audio Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Microphone</span>
                      <Switch checked={!isMuted} onCheckedChange={(checked) => setIsMuted(!checked)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Noise Suppression</span>
                      <Switch
                        checked={aiSettings.audioDenoise}
                        onCheckedChange={(checked) => setAiSettings((prev) => ({ ...prev, audioDenoise: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Light Correction</span>
                      <Switch
                        checked={aiSettings.lightCorrection}
                        onCheckedChange={(checked) =>
                          setAiSettings((prev) => ({
                            ...prev,
                            lightCorrection: checked,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Close</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main Stream View */}
        <div
          className={`flex-1 ${isPanelCollapsed ? "w-full" : "lg:w-3/4"} transition-all duration-300 overflow-hidden`}
        >
          <div className="h-full flex flex-col">
            {/* Stream Preview */}
            <div className="relative flex-1 bg-black overflow-hidden">
              <div className="absolute top-4 right-4 z-20 space-y-2">
                <Badge variant="secondary">Stage: {stage}</Badge>
                <div className="flex gap-2">
                  <Badge variant={deviceStatus.mic === "granted" || !consentPreferences.allowMic ? "default" : "destructive"}>Mic: {consentPreferences.allowMic ? deviceStatus.mic : "optional"}</Badge>
                  <Badge variant={deviceStatus.camera === "granted" || !consentPreferences.allowCamera ? "default" : "destructive"}>Cam: {consentPreferences.allowCamera ? deviceStatus.camera : "optional"}</Badge>
                  <Badge variant={deviceStatus.screen === "granted" || !consentPreferences.allowScreenShare ? "default" : "destructive"}>Screen: {consentPreferences.allowScreenShare ? deviceStatus.screen : "optional"}</Badge>
                </div>
              </div>

              {!isStreaming && (
                <Card className="absolute left-4 top-4 z-20 w-full max-w-xl bg-background/95">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Live Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded border p-2 text-sm">
                        <span>Allow mic</span>
                        <Switch
                          checked={consentPreferences.allowMic}
                          onCheckedChange={(checked) => {
                            const next = { ...consentPreferences, allowMic: checked }
                            setConsentPreferences(next)
                            void syncConsent(next)
                          }}
                        />
                      </label>
                      <label className="flex items-center justify-between rounded border p-2 text-sm">
                        <span>Allow camera</span>
                        <Switch
                          checked={consentPreferences.allowCamera}
                          onCheckedChange={(checked) => {
                            const next = { ...consentPreferences, allowCamera: checked }
                            setConsentPreferences(next)
                            void syncConsent(next)
                          }}
                        />
                      </label>
                      <label className="flex items-center justify-between rounded border p-2 text-sm">
                        <span>Allow screen share</span>
                        <Switch
                          checked={consentPreferences.allowScreenShare}
                          onCheckedChange={(checked) => {
                            const next = { ...consentPreferences, allowScreenShare: checked }
                            setConsentPreferences(next)
                            void syncConsent(next)
                          }}
                        />
                      </label>
                      <label className="flex items-center justify-between rounded border p-2 text-sm">
                        <span>Allow recording</span>
                        <Switch
                          checked={consentPreferences.allowRecording}
                          onCheckedChange={(checked) => {
                            const next = { ...consentPreferences, allowRecording: checked }
                            setConsentPreferences(next)
                            void syncConsent(next)
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {stage === "permissions" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => void requestMediaPermission("mic")}>Grant microphone</Button>
                          <Button size="sm" variant="outline" onClick={() => void requestMediaPermission("camera")}>Grant camera</Button>
                          <Button size="sm" variant="outline" onClick={() => void requestScreenSharePermission()}>Grant screen share</Button>
                          <Button size="sm" disabled={!areRequiredPermissionsGranted} onClick={() => setStage("preview")}>Continue to preview</Button>
                        </>
                      )}
                      {stage === "preview" && (
                        <Button size="sm" onClick={() => setIsPreviewVisible(true)}>
                          {isPreviewVisible ? "Preview visible" : "Show preview"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <ScreenShareWithAnnotations
                isStreaming={isStreaming}
                initialSettings={aiSettings}
                onSettingsChange={setAiSettings}
              />

              {/* Stream Info Overlay */}
              {isStreaming && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-md px-3 py-1.5 text-white">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </div>
                  <span className="text-sm font-medium">LIVE</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm">{viewerCount} watching</span>
                </div>
              )}

              {/* Stream Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-white hover:bg-white/20"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isMuted ? "Unmute Microphone" : "Mute Microphone"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-white hover:bg-white/20"
                        onClick={() => setIsCameraOn(!isCameraOn)}
                      >
                        {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isCameraOn ? "Turn Camera Off" : "Turn Camera On"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-white hover:bg-white/20"
                        onClick={() => void requestScreenSharePermission()}
                      >
                        <ScreenShare className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share Screen</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Separator orientation="vertical" className="h-6" />

                <Button
                  variant={isStreaming ? "destructive" : "default"}
                  className={
                    isStreaming
                      ? ""
                      : "bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500"
                  }
                  onClick={handleToggleStream}
                  disabled={!isStreaming && !canStartLive}
                >
                  {isStreaming ? "End Stream" : "Go Live"}
                </Button>

                {isStreaming && (
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    className={
                      isRecording
                        ? ""
                        : "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                    }
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Stream Stats */}
            <div className="bg-card/50 backdrop-blur border-t p-3 grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  <span>Viewers</span>
                </div>
                <p className="text-lg font-semibold">{realtimeStats.viewers}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  <span>Likes</span>
                </div>
                <p className="text-lg font-semibold">{realtimeStats.likes}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>Comments</span>
                </div>
                <p className="text-lg font-semibold">{realtimeStats.comments}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Share2 className="h-3 w-3" />
                  <span>Shares</span>
                </div>
                <p className="text-lg font-semibold">{realtimeStats.shares}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div
          className={`border-l bg-card/50 backdrop-blur ${isPanelCollapsed ? "w-0 opacity-0" : "w-full lg:w-1/4 opacity-100"} transition-all duration-300 overflow-hidden`}
        >
          {!isPanelCollapsed && (
            <div className="h-full flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-medium">Stream Controls</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsPanelCollapsed(true)} className="h-8 w-8">
                  <PanelRight className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start px-3 pt-3 bg-transparent">
                  <TabsTrigger
                    value="chat"
                    className="data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/20"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger
                    value="health"
                    className="data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/20"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Health
                  </TabsTrigger>
                  <TabsTrigger
                    value="platforms"
                    className="data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/20"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Platforms
                  </TabsTrigger>
                  <TabsTrigger
                    value="effects"
                    className="data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/20"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Effects
                  </TabsTrigger>
                  <TabsTrigger
                    value="multihost"
                    className="data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/20"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Multi-Host
                  </TabsTrigger>
                  <TabsTrigger
                    value="engagement"
                    className="data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/20"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Engagement
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 p-0 m-0">
                  <StreamChat isStreaming={isStreaming} streamId={streamSessionId} />
                </TabsContent>

                <TabsContent value="health" className="flex-1 p-3 m-0 space-y-4">
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm">Stream Health</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Bitrate</p>
                            <p className="font-medium">{healthMetrics.bitrateKbps.toLocaleString()} kbps</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">RTT</p>
                            <p className="font-medium">{healthMetrics.rttMs.toFixed(0)} ms</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Dropped Frames</p>
                            <p className="font-medium">{healthMetrics.droppedFrames}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Packet Loss</p>
                            <p className="font-medium">{healthMetrics.packetLossPct.toFixed(2)}%</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Overall Health</p>
                            <Badge
                              variant="outline"
                              className={`
                                ${streamHealth === "excellent" ? "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400" : ""}
                                ${streamHealth === "good" ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : ""}
                                ${streamHealth === "fair" ? "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400" : ""}
                                ${streamHealth === "poor" ? "border-red-200 text-red-700 dark:border-red-800 dark:text-red-400" : ""}
                              `}
                            >
                              {streamHealth.toUpperCase()}
                            </Badge>
                          </div>
                          <Progress
                            value={
                              streamHealth === "excellent"
                                ? 95
                                : streamHealth === "good"
                                  ? 75
                                  : streamHealth === "fair"
                                    ? 50
                                    : 25
                            }
                            className="h-2"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <StreamHealth streamId={streamSessionId ?? undefined} />
                </TabsContent>

                <TabsContent value="platforms" className="flex-1 p-3 m-0">
                  <MultiPlatformStreaming isStreaming={isStreaming} onPlatformsChange={handlePlatformChange} />
                </TabsContent>

                <TabsContent value="effects" className="flex-1 p-3 m-0">
                  <VirtualBackgrounds />
                </TabsContent>
                <TabsContent value="multihost" className="flex-1 p-0 m-0">
                  <MultiHostManager isStreaming={isStreaming} currentUserId="current-user-id" />
                </TabsContent>

                <TabsContent value="engagement" className="flex-1 p-3 m-0 space-y-4 overflow-y-auto">
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">Engagement Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 p-3 pt-0 sm:grid-cols-2">
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Viewers</p>
                        <p className="text-lg font-semibold">{realtimeStats.viewers.toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Likes</p>
                        <p className="text-lg font-semibold">{realtimeStats.likes.toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Comments</p>
                        <p className="text-lg font-semibold">{realtimeStats.comments.toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">Shares</p>
                        <p className="text-lg font-semibold">{realtimeStats.shares.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">Live Polls & Q&A</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <PollQuizManager streamId={studioStreamId} isHost={true} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Collapsed Panel Toggle */}
        {isPanelCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelCollapsed(false)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 backdrop-blur border shadow-md"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Alert display component (invisible until alerts are triggered) */}
      <AlertDisplay isStreaming={isStreaming} alertsEnabled={true} queueAlerts={true} alertDelay={2} testMode={false} />
    </div>
  )
}
