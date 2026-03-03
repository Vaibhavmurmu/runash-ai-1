"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HardDrive, Cloud, Settings, FileVideo, Scissors } from "lucide-react"
import RecordingSettingsComponent from "@/components/streaming/recording/recording-settings"
import RecordedStreamsLibrary from "@/components/streaming/recording/recorded-streams-library"
import StorageUsageComponent from "@/components/streaming/recording/storage-usage"
import CloudStorageProviderComponent from "@/components/streaming/recording/cloud-storage-provider"
import StreamPlayback from "@/components/streaming/recording/stream-playback"
import ShareDialog from "@/components/streaming/recording/share-dialog"
import ClipEditor from "@/components/streaming/recording/clip-editor"
import VideoEditor from "@/components/streaming/recording/video-editor"
import { RecordingService, DEFAULT_CLOUD_PROVIDERS } from "@/lib/recording-service"
import { toast } from "@/components/ui/use-toast"
import type { LibraryQueryParams } from "@/lib/recording-service"
import type {
  RecordedStream,
  RecordingSettings,
  StorageUsage,
  CloudStorageProvider,
  StreamHighlight,
} from "@/types/recording"

const DEFAULT_LIBRARY_QUERY: LibraryQueryParams = {
  page: 1,
  pageSize: 8,
  segment: "recent",
  search: "",
  sort: "date-desc",
  platform: "all",
  status: "all",
}

export default function RecordingsPage() {
  const [activeTab, setActiveTab] = useState("library")
  const [recordings, setRecordings] = useState<RecordedStream[]>([])
  const [libraryQuery, setLibraryQuery] = useState<LibraryQueryParams>(DEFAULT_LIBRARY_QUERY)
  const [hasMoreRecordings, setHasMoreRecordings] = useState(false)
  const [isLibraryLoading, setIsLibraryLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedStream, setSelectedStream] = useState<RecordedStream | null>(null)
  const [isPlaybackOpen, setIsPlaybackOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isClipEditorOpen, setIsClipEditorOpen] = useState(false)
  const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false)
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    used: 0,
    total: 0,
    recordings: 0,
  })
  const [cloudProviders, setCloudProviders] = useState<CloudStorageProvider[]>(DEFAULT_CLOUD_PROVIDERS)
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>({
    autoRecord: true,
    recordAudio: true,
    recordVideo: true,
    quality: "high",
    format: "mp4",
    storage: "cloud",
    maxStorageGB: 50,
    autoDelete: false,
    autoDeleteAfterDays: 30,
    saveChat: true,
    createHighlights: true,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadLibrary = useCallback(async (query: LibraryQueryParams, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLibraryLoading(true)
      }

      const response = await RecordingService.getLibraryRecordings(query)
      setHasMoreRecordings(response.pagination.hasMore)
      setRecordings((prev) => (append ? [...prev, ...response.items] : response.items))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load library"
      setLoadError(message)
      toast({ title: "Unable to load library", description: message })
    } finally {
      setIsLibraryLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [storageData, settingsData] = await Promise.all([
        RecordingService.getStorageUsage(),
        RecordingService.getSettings(),
      ])

      setStorageUsage(storageData)
      setRecordingSettings(settingsData)
      await loadLibrary(DEFAULT_LIBRARY_QUERY)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load recordings"
      setLoadError(message)
      toast({
        title: "Unable to load recordings",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }, [loadLibrary])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleLibraryQueryChange = (nextQuery: LibraryQueryParams) => {
    setLibraryQuery(nextQuery)
    void loadLibrary(nextQuery)
  }

  const handleLoadMore = () => {
    if (!hasMoreRecordings) {
      return
    }

    const nextQuery = {
      ...libraryQuery,
      page: (libraryQuery.page ?? 1) + 1,
    }

    setLibraryQuery(nextQuery)
    void loadLibrary(nextQuery, true)
  }

  const handlePlayRecording = (stream: RecordedStream) => {
    setSelectedStream(stream)
    setIsPlaybackOpen(true)
  }

  const handleEditRecording = (stream: RecordedStream) => {
    setSelectedStream(stream)
    setIsVideoEditorOpen(true)
  }

  const handleDeleteRecording = async (streamId: string) => {
    try {
      await RecordingService.deleteRecording(streamId)
      await loadLibrary(libraryQuery)
      toast({ title: "Recording deleted" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete recording"
      toast({
        title: "Delete failed",
        description: message,
        action: (
          <Button variant="outline" size="sm" onClick={() => handleDeleteRecording(streamId)}>
            Retry
          </Button>
        ),
      })
    }
  }

  const handleDownloadRecording = async (stream: RecordedStream) => {
    try {
      await RecordingService.downloadRecording(stream.id)
      toast({ title: "Download started", description: `Preparing ${stream.title}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download recording"
      toast({
        title: "Download failed",
        description: message,
        action: (
          <Button variant="outline" size="sm" onClick={() => handleDownloadRecording(stream)}>
            Retry
          </Button>
        ),
      })
    }
  }

  const handleShareRecording = async (stream: RecordedStream) => {
    try {
      const shareUrl = await RecordingService.shareRecording(stream.id)
      await navigator.clipboard.writeText(shareUrl)
      setSelectedStream(stream)
      setIsShareOpen(true)
      toast({ title: "Share link copied", description: "The recording is now shareable." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to share recording"
      toast({
        title: "Share failed",
        description: message,
        action: (
          <Button variant="outline" size="sm" onClick={() => handleShareRecording(stream)}>
            Retry
          </Button>
        ),
      })
    }
  }

  const handleCreateClip = (stream: RecordedStream) => {
    setSelectedStream(stream)
    setIsClipEditorOpen(true)
  }

  const handleSaveClip = async (clip: StreamHighlight) => {
    if (!selectedStream) {
      return
    }

    try {
      await RecordingService.createClip(selectedStream.id, clip)
      setIsClipEditorOpen(false)
      await loadLibrary(libraryQuery)
      toast({ title: "Clip created", description: `Saved clip "${clip.title}"` })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save clip"
      toast({
        title: "Clip creation failed",
        description: message,
        action: (
          <Button variant="outline" size="sm" onClick={() => handleSaveClip(clip)}>
            Retry
          </Button>
        ),
      })
    }
  }

  const handleSaveEditedVideo = async (editedVideo: any) => {
    if (!selectedStream) {
      return
    }

    try {
      await RecordingService.saveEditedVideo({
        ...editedVideo,
        originalId: selectedStream.id,
        startTime: new Date((editedVideo.startTime ?? 0) * 1000).toISOString(),
        endTime: new Date((editedVideo.endTime ?? 0) * 1000).toISOString(),
      })
      setIsVideoEditorOpen(false)
      await loadLibrary(libraryQuery)
      toast({ title: "Edit queued", description: "Your edited video is being processed." })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save edited video"
      toast({
        title: "Save failed",
        description: message,
        action: (
          <Button variant="outline" size="sm" onClick={() => handleSaveEditedVideo(editedVideo)}>
            Retry
          </Button>
        ),
      })
    }
  }

  const handleConnectProvider = (providerId: string) => {
    setCloudProviders((prev) =>
      prev.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              isConnected: true,
            }
          : provider,
      ),
    )
  }

  const handleDisconnectProvider = (providerId: string) => {
    setCloudProviders((prev) =>
      prev.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              isConnected: false,
            }
          : provider,
      ),
    )
  }

  const handleSaveSettings = async (settings: RecordingSettings) => {
    try {
      const updatedSettings = await RecordingService.updateSettings(settings)
      setRecordingSettings(updatedSettings)
      toast({ title: "Settings updated" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings"
      toast({
        title: "Settings save failed",
        description: message,
        action: (
          <Button variant="outline" size="sm" onClick={() => handleSaveSettings(settings)}>
            Retry
          </Button>
        ),
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading recordings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto py-8">
        {loadError ? (
          <Card className="mb-4 border-red-300">
            <CardHeader>
              <CardTitle>Could not refresh recordings</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadData}>Retry</Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Recordings</h1>
          <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90">
            <FileVideo className="h-4 w-4 mr-2" />
            Manage Storage
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="library" className="flex items-center">
              <FileVideo className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
            <TabsTrigger value="clips" className="flex items-center">
              <Scissors className="h-4 w-4 mr-2" />
              Clips
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center">
              <HardDrive className="h-4 w-4 mr-2" />
              Storage
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <RecordedStreamsLibrary
              streams={recordings}
              query={libraryQuery}
              isLoading={isLibraryLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMoreRecordings}
              onQueryChange={handleLibraryQueryChange}
              onLoadMore={handleLoadMore}
              onPlay={handlePlayRecording}
              onEdit={handleEditRecording}
              onDelete={handleDeleteRecording}
              onDownload={handleDownloadRecording}
              onShare={handleShareRecording}
              onCreateClip={handleCreateClip}
            />
          </TabsContent>

          <TabsContent value="clips" className="mt-0">
            <div className="text-center py-16">
              <Scissors className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">No clips yet</h3>
              <p className="text-gray-500 mb-4">Create clips from your recordings to highlight the best moments</p>
              <Button
                onClick={() => setActiveTab("library")}
                className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90"
              >
                Browse Recordings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <StorageUsageComponent usage={storageUsage} />
              </div>
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Cloud className="h-5 w-5 mr-2" />
                      Cloud Storage
                    </CardTitle>
                    <CardDescription>Connect cloud storage providers to store your recordings</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cloudProviders.map((provider) => (
                      <CloudStorageProviderComponent
                        key={provider.id}
                        provider={provider}
                        onConnect={handleConnectProvider}
                        onDisconnect={handleDisconnectProvider}
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <RecordingSettingsComponent initialSettings={recordingSettings} onSave={handleSaveSettings} />
          </TabsContent>
        </Tabs>

        <StreamPlayback
          stream={selectedStream}
          isOpen={isPlaybackOpen}
          onClose={() => setIsPlaybackOpen(false)}
          onDownload={handleDownloadRecording}
          onShare={handleShareRecording}
        />

        <ShareDialog stream={selectedStream} isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />

        <ClipEditor
          stream={selectedStream}
          isOpen={isClipEditorOpen}
          onClose={() => setIsClipEditorOpen(false)}
          onSave={handleSaveClip}
        />

        {selectedStream && (
          <VideoEditor
            videoUrl={selectedStream.recordingUrl}
            isOpen={isVideoEditorOpen}
            onClose={() => setIsVideoEditorOpen(false)}
            onSave={handleSaveEditedVideo}
          />
        )}
      </div>
    </div>
  )
}
