"use client"

import { useEffect, useMemo, useState } from "react"
import EditorLayout from "@/components/editor/editor-layout"
import TopBar from "@/components/editor/top-bar"
import LeftSidebar from "@/components/editor/left-sidebar"
import MainCanvas from "@/components/editor/main-canvas"
import RightPanel from "@/components/editor/right-panel"
import BottomToolbar from "@/components/editor/bottom-toolbar"
import AIChatPanel from "@/components/editor/ai-chat-panel"
import CollaborationPanel from "@/components/editor/collaboration-panel"
import { useToast } from "@/hooks/use-toast"
import type { EditorProject, EditorTimeline } from "@/lib/editor/domain"

export default function EditorPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedModel, setSelectedModel] = useState("wan-2.1")
  const [isRecording, setIsRecording] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false)
  const [project, setProject] = useState<EditorProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [uploadInProgress, setUploadInProgress] = useState(false)

  const activeTimeline = useMemo(() => {
    if (!project) return undefined
    return project.timelines.find((timeline) => timeline.id === project.activeTimelineId) ?? project.timelines[0]
  }, [project])

  const loadProject = async () => {
    setIsLoading(true)
    try {
      const listRes = await fetch("/api/editor/projects")
      if (!listRes.ok) throw new Error("Failed to list projects")
      const listJson = await listRes.json()
      const projectId = listJson.projects?.[0]?.id as string | undefined

      if (!projectId) {
        const createRes = await fetch("/api/editor/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Untitled Project" }),
        })
        if (!createRes.ok) throw new Error("Failed to create project")
        const createJson = await createRes.json()
        setProject(createJson.project)
      } else {
        const res = await fetch(`/api/editor/projects/${projectId}`)
        if (!res.ok) throw new Error("Failed to load project")
        const json = await res.json()
        setProject(json.project)
      }
    } catch {
      toast({ title: "Editor load failed", description: "Could not load project data.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProject()
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
      setProject(json.project)
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
        storageKey = storageJson.data.key
        accessUrl = storageJson.data.url
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
    setIsBusy(true)
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
      setIsBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    setIsBusy(true)
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
      setIsBusy(false)
    }
  }

  const handleExportMetadata = async () => {
    if (!project) return
    setIsBusy(true)
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
      setIsBusy(false)
    }
  }

  return (
    <EditorLayout>
      <TopBar isRecording={isRecording} onRecordingToggle={setIsRecording} onOpenCollaboration={() => setIsCollaborationOpen(true)} onSave={saveProject} isSaving={isSaving} />
      <div className="flex flex-1 overflow-hidden bg-background">
        <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} isChatOpen={isChatOpen} onChatToggle={setIsChatOpen} />
        <MainCanvas
          selectedModel={selectedModel}
          isRecording={isRecording}
          timeline={activeTimeline}
          onTimelineChange={handleTimelineChange}
          onUploadMedia={handleUploadMedia}
          uploadInProgress={uploadInProgress}
        />
        <RightPanel selectedModel={selectedModel} onModelChange={setSelectedModel} activeTab={activeTab} />
        {isChatOpen && <AIChatPanel isOpen={isChatOpen} />}
      </div>
      <BottomToolbar onDuplicate={handleDuplicate} onDelete={handleDelete} onExportMetadata={handleExportMetadata} isBusy={isBusy || isLoading} />
      <CollaborationPanel isOpen={isCollaborationOpen} onClose={() => setIsCollaborationOpen(false)} />
    </EditorLayout>
  )
}
