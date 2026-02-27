"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import EditorLayout from "@/components/editor/editor-layout"
import TopBar from "@/components/editor/top-bar"
import LeftSidebar from "@/components/editor/left-sidebar"
import MainCanvas from "@/components/editor/main-canvas"
import RightPanel from "@/components/editor/right-panel"
import BottomToolbar from "@/components/editor/bottom-toolbar"
import AIChatPanel from "@/components/editor/ai-chat-panel"
import CollaborationPanel from "@/components/editor/collaboration-panel"
import { useToast } from "@/hooks/use-toast"
import type { EditorProject, EditorRenderJob, EditorTimeline } from "@/lib/editor/domain"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useDashboardModelDialog } from "@/components/dashboard/model-dialog-provider"
import { WelcomeOnboardingModal } from "@/components/dashboard/onboarding/welcome-onboarding-modal"
import { CreateProjectModal, type QuickStartMode } from "@/components/dashboard/projects/create-project-modal"

type OnboardingState = {
  editorWelcomeCompletedAt?: string
  editorWelcomeSkippedAt?: string
}

export function EditorWorkspace() {
  const { toast } = useToast()
  const { openFromTrigger } = useDashboardModelDialog()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedModel, setSelectedModel] = useState("wan-2.1")
  const [isRecording, setIsRecording] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false)
  const [project, setProject] = useState<EditorProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isProjectActionBusy, setIsProjectActionBusy] = useState(false)
  const [isGeneratingRender, setIsGeneratingRender] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isUpdatingOnboarding, setIsUpdatingOnboarding] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generationJob, setGenerationJob] = useState<EditorRenderJob | null>(null)
  const generationAbortRef = useRef<AbortController | null>(null)
  const generationRunIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const searchParams = useSearchParams()
  const queryProjectId = searchParams.get("projectId")
  const queryLibraryItemTitle = searchParams.get("libraryItemTitle")

  const activeTimeline = useMemo(() => {
    if (!project) return undefined
    return project.timelines.find((timeline) => timeline.id === project.activeTimelineId) ?? project.timelines[0]
  }, [project])

  const persistOnboardingState = async (next: OnboardingState) => {
    setIsUpdatingOnboarding(true)
    try {
      const settingsRes = await fetch("/api/settings")
      const settingsJson = await settingsRes.json()
      const settingsData = settingsJson?.data ?? settingsJson
      const currentPreferences = settingsData?.preferences ?? {}
      const currentOnboarding = (currentPreferences.editorOnboarding ?? {}) as OnboardingState

      const patchRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            ...currentPreferences,
            editorOnboarding: {
              ...currentOnboarding,
              ...next,
            },
          },
        }),
      })

      if (!patchRes.ok) {
        throw new Error("Unable to persist onboarding state")
      }
    } finally {
      setIsUpdatingOnboarding(false)
    }
  }

  const createProject = async (payload: {
    name: string
    description?: string
    quickStart: QuickStartMode
    selectedModel?: string
  }) => {
    setIsCreatingProject(true)
    try {
      const createRes = await fetch("/api/editor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!createRes.ok) {
        throw new Error("Failed to create project")
      }

      const createJson = await createRes.json()
      setProject(createJson.project)
      if (payload.selectedModel) {
        setSelectedModel(payload.selectedModel)
      }
      setShowCreateProject(false)
      toast({ title: "Project created", description: "Your editor project is ready." })
    } catch {
      toast({ title: "Create project failed", description: "Unable to create a project right now.", variant: "destructive" })
    } finally {
      setIsCreatingProject(false)
    }
  }

  const loadProject = async () => {
    setIsLoading(true)
    try {
      const settingsRes = await fetch("/api/settings")
      const settingsJson = await settingsRes.json()
      const settingsData = settingsJson?.data ?? settingsJson
      const onboarding = (settingsData?.preferences?.editorOnboarding ?? {}) as OnboardingState
      const hasSeenOnboarding = Boolean(onboarding.editorWelcomeCompletedAt || onboarding.editorWelcomeSkippedAt)
      setShowOnboarding(!hasSeenOnboarding)

      const listRes = await fetch("/api/editor/projects")
      if (!listRes.ok) throw new Error("Failed to list projects")
      const listJson = await listRes.json()
      const listedProjectId = listJson.projects?.[0]?.id as string | undefined
      const projectId = queryProjectId ?? listedProjectId

      if (!projectId) {
        setShowCreateProject(hasSeenOnboarding)
      } else {
        const res = await fetch(`/api/editor/projects/${projectId}`)
        if (!res.ok) throw new Error("Failed to load project")
        const json = await res.json()
        setProject(json.project)
        setShowCreateProject(false)
        const savedModel = json.project?.metadata?.selectedModel
        if (typeof savedModel === "string" && savedModel.length > 0) {
          setSelectedModel(savedModel)
        }
      }
    } catch {
      toast({ title: "Editor load failed", description: "Could not load project data.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProject()
  }, [queryProjectId])

  useEffect(() => {
    if (!queryLibraryItemTitle) return
    toast({ title: "Library item selected", description: `${queryLibraryItemTitle} opened with editor context.` })
  }, [queryLibraryItemTitle])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      generationAbortRef.current?.abort()
    }
  }, [])

  const saveProject = async () => {
    if (!project || !activeTimeline) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/editor/projects/${project.id}/timeline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeline: activeTimeline }),
      })

      if (!res.ok) throw new Error("Failed to save")
      const json = await res.json()

      const metaRes = await fetch(`/api/editor/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...json.project?.metadata, selectedModel } }),
      })

      if (!metaRes.ok) throw new Error("Failed to save project metadata")
      const metaJson = await metaRes.json()

      setProject(metaJson.project)
      setIsDirty(false)
      toast({ title: "Project saved" })
    } catch {
      toast({ title: "Save failed", description: "Your changes were not saved.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!isDirty || !project) return
    const timer = setTimeout(() => {
      void saveProject()
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDirty, project, activeTimeline])

  const handleTimelineChange = (timeline: EditorTimeline) => {
    if (!project) return
    setProject({
      ...project,
      timelines: project.timelines.map((item) => (item.id === timeline.id ? timeline : item)),
      updatedAt: new Date().toISOString(),
    })
    setIsDirty(true)
  }

  const handleUploadMedia = async (file: File) => {
    if (!project || !activeTimeline) return
    setUploadInProgress(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("projectId", project.id)
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form })

      let storageKey = ""
      let accessUrl: string | null = null
      let uploadFileId: string | null = null

      if (uploadRes.ok) {
        const uploadJson = await uploadRes.json()
        uploadFileId = String(uploadJson.file.id)
        storageKey = uploadJson.file.storageKey
        accessUrl = uploadJson.access.url
      } else {
        const storageForm = new FormData()
        storageForm.append("action", "upload")
        storageForm.append("file", file)
        storageForm.append("folder", `editor/${project.id}`)
        const storageRes = await fetch("/api/storage", { method: "POST", body: storageForm })
        if (!storageRes.ok) throw new Error("Upload failed")
        const storageJson = await storageRes.json()
        storageKey = storageJson.key
        accessUrl = storageJson.url
      }

      const assetRes = await fetch(`/api/editor/projects/${project.id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: uploadFileId ? "upload" : "storage",
          uploadFileId,
          storageKey,
          accessUrl,
          mimeType: file.type,
          sizeBytes: file.size,
          metadata: { name: file.name },
        }),
      })
      if (!assetRes.ok) throw new Error("Failed to persist asset")
      const assetJson = await assetRes.json()

      const track = activeTimeline.tracks[0]
      if (track) {
        handleTimelineChange({
          ...activeTimeline,
          segments: [
            ...activeTimeline.segments,
            {
              id: crypto.randomUUID(),
              projectId: project.id,
              timelineId: activeTimeline.id,
              ownerId: project.ownerId,
              trackId: track.id,
              assetId: assetJson.asset.id,
              label: file.name,
              segmentType: file.type.startsWith("video") ? "video" : "image",
              startSeconds: 0,
              endSeconds: 3,
              metadata: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })
      }

      setProject((prev) => (prev ? { ...prev, assets: [assetJson.asset, ...prev.assets] } : prev))
      toast({ title: "Media uploaded", description: `${file.name} is now available in this project.` })
    } catch {
      toast({ title: "Upload failed", description: "Unable to add media right now.", variant: "destructive" })
    } finally {
      setUploadInProgress(false)
    }
  }

  const handleDuplicate = async () => {
    if (!project) return
    setIsProjectActionBusy(true)
    try {
      const res = await fetch(`/api/editor/projects/${project.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Duplicate failed")
      const json = await res.json()
      setProject(json.project)
      setIsDirty(false)
      toast({ title: "Project duplicated" })
    } catch {
      toast({ title: "Duplicate failed", variant: "destructive" })
    } finally {
      setIsProjectActionBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    setIsProjectActionBusy(true)
    const deletedId = project.id
    setProject(null)
    try {
      const res = await fetch(`/api/editor/projects/${deletedId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Project deleted" })
      await loadProject()
    } catch {
      toast({ title: "Delete failed", description: "Project could not be deleted.", variant: "destructive" })
      await loadProject()
    } finally {
      setIsProjectActionBusy(false)
    }
  }

  const handleExportMetadata = async () => {
    if (!project) return
    setIsProjectActionBusy(true)
    try {
      const res = await fetch(`/api/editor/projects/${project.id}/export`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-metadata.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast({ title: "Metadata exported" })
    } catch {
      toast({ title: "Export failed", description: "Could not export metadata.", variant: "destructive" })
    } finally {
      setIsProjectActionBusy(false)
    }
  }

  useEffect(() => {
    if (!activeTimeline) return
    if (playbackTime <= activeTimeline.durationSeconds) return
    setPlaybackTime(activeTimeline.durationSeconds)
  }, [activeTimeline, playbackTime])

  const handleSeek = (time: number) => {
    const maxDuration = activeTimeline?.durationSeconds ?? 0
    setPlaybackTime(Math.max(0, Math.min(time, maxDuration)))
  }

  const handleSkipPrevious = () => {
    if (!activeTimeline) return
    const previous = [...activeTimeline.segments]
      .filter((segment) => segment.startSeconds < playbackTime)
      .sort((a, b) => b.startSeconds - a.startSeconds)[0]

    setPlaybackTime(previous ? previous.startSeconds : 0)
  }

  const handleSkipNext = () => {
    if (!activeTimeline) return
    const next = [...activeTimeline.segments]
      .filter((segment) => segment.startSeconds > playbackTime)
      .sort((a, b) => a.startSeconds - b.startSeconds)[0]

    setPlaybackTime(next ? next.startSeconds : activeTimeline.durationSeconds)
  }

  const handleGenerateVideo = async () => {
    if (!project || !activeTimeline) return

    generationAbortRef.current?.abort()
    const controller = new AbortController()
    generationAbortRef.current = controller
    generationRunIdRef.current += 1
    const currentRunId = generationRunIdRef.current

    const isStaleOrCancelled = () =>
      controller.signal.aborted || generationRunIdRef.current !== currentRunId || !isMountedRef.current

    setIsGeneratingRender(true)
    try {
      const createRes = await fetch("/api/editor/render-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          projectId: project.id,
          payload: {
            timelineId: activeTimeline.id,
            timelineDurationSeconds: activeTimeline.durationSeconds,
            segmentCount: activeTimeline.segments.length,
            modelId: selectedModel,
          },
        }),
      })

      if (!createRes.ok) throw new Error("Failed to queue generation")
      if (isStaleOrCancelled()) return

      const createJson = await createRes.json()
      const job = createJson.job as EditorRenderJob
      if (isStaleOrCancelled()) return

      setGenerationJob(job)

      toast({ title: "Generation queued", description: "Render job started for this timeline." })

      for (let i = 0; i < 30; i += 1) {
        if (isStaleOrCancelled()) return
        await new Promise((resolve) => setTimeout(resolve, 1000))
        if (isStaleOrCancelled()) return

        const pollRes = await fetch(`/api/editor/render-jobs/${job.id}`, { signal: controller.signal })
        if (!pollRes.ok) break
        if (isStaleOrCancelled()) return

        const pollJson = await pollRes.json()
        const polled = pollJson.job as EditorRenderJob
        if (isStaleOrCancelled()) return

        setGenerationJob(polled)

        if (polled.status === "completed") {
          toast({ title: "Generation completed", description: "Your render job has completed." })
          return
        }

        if (polled.status === "failed") {
          throw new Error("Render job failed")
        }
      }

      toast({ title: "Generation queued", description: "Job is still processing. Check back shortly." })
    } catch (error) {
      if (isStaleOrCancelled()) return
      if (error instanceof DOMException && error.name === "AbortError") return

      toast({ title: "Generation failed", description: "Unable to generate video right now.", variant: "destructive" })
    } finally {
      if (!isMountedRef.current) return
      if (generationRunIdRef.current !== currentRunId) return
      setIsGeneratingRender(false)
    }
  }

  const frameRate = activeTimeline?.frameRate ?? 30
  const frameIndex = Math.max(1, Math.floor(playbackTime * frameRate) + 1)
  const totalFrames = Math.max(1, Math.floor((activeTimeline?.durationSeconds ?? 1) * frameRate))

  useEffect(() => {
    if (!project) return

    const savedModel = project.metadata?.selectedModel
    if (savedModel === selectedModel) return

    setProject({
      ...project,
      metadata: {
        ...project.metadata,
        selectedModel,
      },
      updatedAt: new Date().toISOString(),
    })
    setIsDirty(true)
  }, [selectedModel, project])

  useEffect(() => {
    setGenerationJob(null)
  }, [project?.id])

  return (
    <>
      <WelcomeOnboardingModal
        open={showOnboarding}
        isSaving={isUpdatingOnboarding}
        onSkip={() => {
          void persistOnboardingState({ editorWelcomeSkippedAt: new Date().toISOString() })
          setShowOnboarding(false)
          if (!project) setShowCreateProject(true)
        }}
        onComplete={() => {
          void persistOnboardingState({ editorWelcomeCompletedAt: new Date().toISOString() })
          setShowOnboarding(false)
          if (!project) setShowCreateProject(true)
        }}
      />
      <CreateProjectModal open={showCreateProject} isSubmitting={isCreatingProject} onCreate={createProject} />

      <EditorLayout>
        <TopBar
          isRecording={isRecording}
          onRecordingToggle={setIsRecording}
          onOpenCollaboration={() => setIsCollaborationOpen(true)}
          onSave={saveProject}
          isSaving={isSaving}
          onOpenModelDialog={(trigger) =>
            openFromTrigger(
              {
                triggerSource: "editor",
                mode: "configure",
                model: {
                  modelId: selectedModel,
                  provider: "RunAsh AI",
                  displayName: `Editor Model (${selectedModel})`,
                },
                payload: { prompt: "Review editor generation settings before launching a new run." },
              },
              trigger,
            )
          }
        />
        <div className="flex flex-1 overflow-hidden bg-background pb-24 md:pb-0">
          <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} isChatOpen={isChatOpen} onChatToggle={setIsChatOpen} />
          <MainCanvas
            selectedModel={selectedModel}
            isRecording={isRecording}
            timeline={activeTimeline}
            onTimelineChange={handleTimelineChange}
            onUploadMedia={handleUploadMedia}
            uploadInProgress={uploadInProgress}
            isPlaying={isPlaying}
            currentTime={playbackTime}
            onCurrentTimeChange={setPlaybackTime}
            onPlayPause={() => setIsPlaying((prev) => !prev)}
            onSkipPrevious={handleSkipPrevious}
            onSkipNext={handleSkipNext}
            onGenerateVideo={handleGenerateVideo}
            isGeneratingRender={isGeneratingRender}
            generationJob={generationJob}
          />
          <RightPanel selectedModel={selectedModel} onModelChange={setSelectedModel} activeTab={activeTab} />
          {isMobile ? (
            <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
              <SheetContent side="left" className="w-[94vw] max-w-sm p-0">
                <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
              </SheetContent>
            </Sheet>
          ) : (
            isChatOpen && <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          )}
        </div>
        <BottomToolbar
          frameLabel={`${frameIndex} / ${totalFrames}`}
          durationLabel={`${(activeTimeline?.durationSeconds ?? 0).toFixed(1)}s`}
          currentTimeSeconds={playbackTime}
          totalDurationSeconds={activeTimeline?.durationSeconds ?? 0}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying((prev) => !prev)}
          onSkipPrevious={handleSkipPrevious}
          onSkipNext={handleSkipNext}
          onSeek={handleSeek}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onExportMetadata={handleExportMetadata}
          isProjectActionBusy={isProjectActionBusy || isLoading || isCreatingProject}
        />
        <CollaborationPanel isOpen={isCollaborationOpen} onClose={() => setIsCollaborationOpen(false)} />
      </EditorLayout>
    </>
  )
}
