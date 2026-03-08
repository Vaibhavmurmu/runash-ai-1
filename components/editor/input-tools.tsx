"use client"

import { useState, useRef, useEffect } from "react"
import { Monitor, Webcam, Globe, Play, Square, Volume2, Settings, Maximize2, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InputToolsProps {
  isOpen: boolean
  onClose: () => void
}

export default function InputTools({ isOpen, onClose }: InputToolsProps) {
  const [activeTab, setActiveTab] = useState("webcam")
  const [webcamActive, setWebcamActive] = useState(false)
  const [screenShareActive, setScreenShareActive] = useState(false)
  const [webPreviewInput, setWebPreviewInput] = useState("")
  const [webPreviewUrl, setWebPreviewUrl] = useState<string | null>(null)
  const [webPreviewError, setWebPreviewError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const requestWebcamAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: !isMuted,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setWebcamActive(true)
      }
    } catch (error) {
      console.error("Webcam access denied:", error)
    }
  }

  const stopWebcamAccess = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      setWebcamActive(false)
    }
  }

  const requestScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: !isMuted,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setScreenShareActive(true)

        // Stop on track end (when user presses stop in browser dialog)
        stream.getTracks()[0].onended = () => {
          setScreenShareActive(false)
        }
      }
    } catch (error) {
      console.error("Screen share denied:", error)
    }
  }

  const stopScreenShare = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      setScreenShareActive(false)
    }
  }

  const normalizeWebUrl = (value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
      const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      const parsed = new URL(withProtocol)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
      return parsed.toString()
    } catch {
      return null
    }
  }

  const handleLoadWebPreview = () => {
    const nextUrl = normalizeWebUrl(webPreviewInput)
    if (!nextUrl) {
      setWebPreviewError("Enter a valid http/https URL.")
      return
    }

    setWebPreviewError(null)
    setWebPreviewInput(nextUrl)
    setWebPreviewUrl(nextUrl)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Input Tools</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b bg-transparent px-6 pt-4">
            <TabsTrigger value="webcam" className="gap-2">
              <Webcam className="w-4 h-4" />
              Webcam
            </TabsTrigger>
            <TabsTrigger value="screen" className="gap-2">
              <Monitor className="w-4 h-4" />
              Screen Share
            </TabsTrigger>
            <TabsTrigger value="web" className="gap-2">
              <Globe className="w-4 h-4" />
              Web Preview
            </TabsTrigger>
          </TabsList>

          {/* Webcam Tab */}
          <TabsContent value="webcam" className="flex-1 overflow-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Webcam Input</h3>
              <Button
                onClick={isMuted ? undefined : () => setIsMuted(!isMuted)}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                {isMuted ? (
                  <>
                    <Volume2 className="w-4 h-4 line-through" />
                    Muted
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Unmuted
                  </>
                )}
              </Button>
            </div>

            {/* Webcam preview */}
            <div className="relative bg-black rounded-lg border border-border overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

              {!webcamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4">
                  <Webcam className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">Webcam not active</p>
                </div>
              )}

              {webcamActive && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/90 px-3 py-1 rounded-full text-white text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Recording
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!webcamActive ? (
                <Button onClick={requestWebcamAccess} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent">
                  <Play className="w-4 h-4" />
                  Start Webcam
                </Button>
              ) : (
                <Button onClick={stopWebcamAccess} className="flex-1 gap-2" variant="destructive">
                  <Square className="w-4 h-4" />
                  Stop Webcam
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your browser will request permission to access your webcam. Make sure to allow it to proceed.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Screen Share Tab */}
          <TabsContent value="screen" className="flex-1 overflow-auto p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Screen Sharing</h3>

            {/* Screen preview */}
            <div className="relative bg-black rounded-lg border border-border overflow-hidden aspect-video">
              <video
                ref={screenShareActive ? videoRef : undefined}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {!screenShareActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4">
                  <Monitor className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">Screen share not active</p>
                </div>
              )}

              {screenShareActive && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/90 px-3 py-1 rounded-full text-white text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Sharing Screen
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!screenShareActive ? (
                <Button onClick={requestScreenShare} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent">
                  <Play className="w-4 h-4" />
                  Start Screen Share
                </Button>
              ) : (
                <Button onClick={stopScreenShare} className="flex-1 gap-2" variant="destructive">
                  <Square className="w-4 h-4" />
                  Stop Screen Share
                </Button>
              )}
              <Button variant="outline" size="icon">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Choose which screen or window you want to share. You can switch between different displays during
                streaming.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Web Preview Tab */}
          <TabsContent value="web" className="flex-1 overflow-auto p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Web Preview</h3>

            {/* URL input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">Website URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webPreviewInput}
                  onChange={(e) => setWebPreviewInput(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button size="sm" className="gap-2" onClick={handleLoadWebPreview}>
                  <Play className="w-4 h-4" />
                  Load
                </Button>
              </div>
              {webPreviewError && <p className="text-xs text-destructive">{webPreviewError}</p>}
            </div>

            {/* Web preview iframe */}
            <div className="border border-border rounded-lg overflow-hidden bg-white">
              {webPreviewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={webPreviewUrl}
                  className="w-full h-96 border-none"
                  title="Web Preview"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center text-sm text-muted-foreground">Load a URL to start preview.</div>
              )}
            </div>

            {/* Preview controls */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (iframeRef.current && webPreviewUrl) {
                    iframeRef.current.src = webPreviewUrl
                  }
                }}
                disabled={!webPreviewUrl}
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent"
              >
                <Play className="w-4 h-4" />
                Refresh Preview
              </Button>
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => {
                  if (webPreviewUrl) {
                    window.open(webPreviewUrl, "_blank")
                  }
                }}
                disabled={!webPreviewUrl}
              >
                <Maximize2 className="w-4 h-4" />
                Open Full Page
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter a website URL to preview it. You can capture web content during your stream.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
