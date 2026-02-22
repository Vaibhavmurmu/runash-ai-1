"use client"

import { useState } from "react"
import { useRecordings, type Recording } from "@/hooks/use-recordings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Pencil, Trash2, Download, Play, Clock, Eye, Tag, FileVideo, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import SocialShare from "@/components/social-share"

interface RecordingsManagerProps {
  filter?: "all" | "processing" | "completed"
  limit?: number
  showActions?: boolean
}

export default function RecordingsManager({ filter = "all", limit, showActions = true }: RecordingsManagerProps) {
  const { recordings, updateRecording, deleteRecording } = useRecordings()
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const { toast } = useToast()

  // Filter recordings based on the filter prop
  const filteredRecordings = recordings.filter((recording) => {
    if (filter === "all") return true
    if (filter === "processing") return !!recording.isProcessing
    if (filter === "completed") return !recording.isProcessing
    return true
  })

  // Apply limit if specified
  const displayedRecordings = limit ? filteredRecordings.slice(0, limit) : filteredRecordings

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Format views
  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M views`
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K views`
    }
    return `${views} views`
  }

  // Handle edit recording
  const handleEditRecording = (recording: Recording) => {
    setEditingRecording({ ...recording })
    setShowEditDialog(true)
  }

  // Save edited recording
  const saveEditedRecording = () => {
    if (!editingRecording) return

    updateRecording(editingRecording.id, {
      title: editingRecording.title,
      description: editingRecording.description,
      tags: editingRecording.tags,
    })

    setShowEditDialog(false)
    setEditingRecording(null)

    toast({
      title: "Recording updated",
      description: "Your recording details have been updated successfully.",
      variant: "success",
    })
  }

  // Handle delete recording
  const handleDeleteRecording = (id: string) => {
    setRecordingToDelete(id)
    setShowDeleteDialog(true)
  }

  // Confirm delete recording
  const confirmDeleteRecording = () => {
    if (!recordingToDelete) return

    deleteRecording(recordingToDelete)
    setShowDeleteDialog(false)
    setRecordingToDelete(null)
  }

  // Handle download recording
  const handleDownloadRecording = (recording: Recording) => {
    setIsDownloading(recording.id)

    // Simulate download
    toast({
      title: "Download started",
      description: `Downloading "${recording.title}"...`,
    })

    // Simulate download completion after a delay
    setTimeout(() => {
      setIsDownloading(null)
      toast({
        title: "Download complete",
        description: `"${recording.title}" has been downloaded.`,
        variant: "success",
      })
    }, 3000)
  }

  // If no recordings match the filter
  if (displayedRecordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <div className="mb-4 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
          <FileVideo className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-medium">No recordings found</h3>
        <p className="mb-6 text-center text-muted-foreground">
          {filter === "processing"
            ? "You don't have any recordings being processed."
            : filter === "completed"
              ? "You don't have any completed recordings yet."
              : "You haven't recorded any streams yet."}
        </p>
        {filter !== "all" && (
          <Button asChild variant="outline">
            <Link href="/recordings">View All Recordings</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {displayedRecordings.map((recording) => (
          <Card key={recording.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-video w-full sm:w-1/3">
                  {recording.isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-orange-500" />
                      <span className="text-sm text-white">Processing...</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={recording.thumbnail || "/placeholder.svg"}
                        alt={recording.title}
                        className="h-full w-full object-cover"
                      />
                      <Link
                        href={`/recordings/${recording.id}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/30"
                      >
                        <Button size="icon" className="h-12 w-12 rounded-full bg-orange-500/80 hover:bg-orange-600/80">
                          <Play className="h-6 w-6" />
                        </Button>
                      </Link>
                    </>
                  )}
                  <Badge className="absolute bottom-2 right-2 bg-zinc-800/80">
                    {formatDuration(recording.duration)}
                  </Badge>
                  <Badge className="absolute top-2 left-2 bg-zinc-800/80">{recording.quality}</Badge>
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/recordings/${recording.id}`} className="hover:underline">
                        <h3 className="font-medium">{recording.title}</h3>
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{recording.description}</p>
                    </div>
                    {showActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleEditRecording(recording)}
                            disabled={recording.isProcessing}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadRecording(recording)}
                            disabled={recording.isProcessing || isDownloading === recording.id}
                          >
                            {isDownloading === recording.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" /> Download
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild disabled={recording.isProcessing}>
                            <div>
                              <SocialShare
                                title={`Check out my recording: ${recording.title}`}
                                description={recording.description}
                                url={`/recordings/${recording.id}`}
                                image={recording.thumbnail}
                                variant="item"
                              />
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteRecording(recording.id)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(recording.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {formatViews(recording.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" /> {recording.size} MB
                    </span>
                  </div>

                  {recording.tags && recording.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {recording.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Recording Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Recording</DialogTitle>
            <DialogDescription>Update your recording details. Click save when you're done.</DialogDescription>
          </DialogHeader>
          {editingRecording && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-title" className="text-right">
                  Title
                </Label>
                <Input
                  id="edit-title"
                  value={editingRecording.title}
                  onChange={(e) => setEditingRecording({ ...editingRecording, title: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  value={editingRecording.description}
                  onChange={(e) => setEditingRecording({ ...editingRecording, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tags" className="text-right">
                  Tags
                </Label>
                <Input
                  id="edit-tags"
                  value={editingRecording.tags?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingRecording({
                      ...editingRecording,
                      tags: e.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="tech, demo, tutorial (comma separated)"
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditedRecording}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Recording</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRecording}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
