"use client"

import { useEffect, useRef, useState } from "react"
import { Users, Plus, X, Edit3, Check, AlertCircle, Activity, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  status: "online" | "idle" | "offline"
  role: "owner" | "editor" | "viewer"
  lastActive: Date
  cursorPosition?: { x: number; y: number }
  selectedElement?: string
}

interface ActivityLog {
  id: string
  user: string
  action: string
  timestamp: Date
  type: "edit" | "comment" | "collaboration" | "system"
  details?: string
}

interface CollaborationPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function CollaborationPanel({ isOpen, onClose }: CollaborationPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: "1",
      name: "You",
      email: "you@example.com",
      avatar: "/placeholder-user.jpg",
      status: "online",
      role: "owner",
      lastActive: new Date(),
      cursorPosition: { x: 100, y: 200 },
      selectedElement: "timeline-segment-1",
    },
    {
      id: "2",
      name: "Alice Chen",
      email: "alice@example.com",
      status: "online",
      role: "editor",
      lastActive: new Date(Date.now() - 10000),
      cursorPosition: { x: 300, y: 150 },
      selectedElement: "text-layer",
    },
    {
      id: "3",
      name: "Bob Smith",
      email: "bob@example.com",
      status: "idle",
      role: "viewer",
      lastActive: new Date(Date.now() - 60000),
    },
  ])

  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    {
      id: "1",
      user: "Alice Chen",
      action: "Modified timeline segment",
      timestamp: new Date(Date.now() - 30000),
      type: "edit",
      details: "Extended duration from 3s to 4s",
    },
    {
      id: "2",
      user: "You",
      action: "Added new layer",
      timestamp: new Date(Date.now() - 60000),
      type: "edit",
      details: "Created text layer",
    },
    {
      id: "3",
      user: "Bob Smith",
      action: "Joined the session",
      timestamp: new Date(Date.now() - 120000),
      type: "collaboration",
    },
    {
      id: "4",
      user: "Alice Chen",
      action: "Started editing",
      timestamp: new Date(Date.now() - 180000),
      type: "collaboration",
    },
  ])

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor")

  useEffect(() => {
    if (!isOpen) return

    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose])

  const handleInviteCollaborator = () => {
    if (!inviteEmail.trim()) return
    // In a real app, this would send an invitation
    setInviteEmail("")
  }

  const handleRemoveCollaborator = (collaboratorId: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))
  }

  const getStatusColor = (status: Collaborator["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "idle":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-500"
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return "now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return "offline"
  }

  if (!isOpen) return null

  const onlineCount = collaborators.filter((c) => c.status === "online").length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Collaboration panel">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Collaboration</h2>
            <Badge variant="secondary" className="ml-2">
              {onlineCount} online
            </Badge>
          </div>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Close collaboration panel">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="collaborators" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none border-b bg-transparent px-6 pt-4 justify-start">
            <TabsTrigger value="collaborators" className="gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Share
            </TabsTrigger>
          </TabsList>

          {/* Collaborators Tab */}
          <TabsContent value="collaborators" className="flex-1 overflow-auto p-6 space-y-4">
            <ScrollArea className="h-80">
              <div className="space-y-3 pr-4">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={collaborator.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{collaborator.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(collaborator.status)}`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">{collaborator.name}</p>
                          <Badge variant={collaborator.role === "owner" ? "default" : "secondary"} className="text-xs">
                            {collaborator.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{collaborator.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(collaborator.lastActive)}</p>
                      </div>
                    </div>

                    {collaborator.id !== "1" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="ml-2"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Invite Collaborator</h3>

              <div className="flex gap-2">
                <Input
                  aria-label="Invite collaborator email"
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 bg-background"
                />
                <select
                  aria-label="Invite role"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <Button
                onClick={handleInviteCollaborator}
                className="w-full gap-2 bg-gradient-to-r from-primary to-accent"
              >
                <Plus className="w-4 h-4" />
                Send Invite
              </Button>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 overflow-auto p-6">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {activityLog.map((log) => (
                  <div key={log.id} className="flex gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      {log.type === "edit" && <Edit3 className="w-4 h-4 text-primary" />}
                      {log.type === "collaboration" && <Users className="w-4 h-4 text-accent" />}
                      {log.type === "comment" && <AlertCircle className="w-4 h-4 text-orange-500" />}
                      {log.type === "system" && <Check className="w-4 h-4 text-green-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{log.user}</span>
                        <span className="text-muted-foreground"> {log.action}</span>
                      </p>
                      {log.details && <p className="text-xs text-muted-foreground mt-1">{log.details}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {log.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Share Settings Tab */}
          <TabsContent value="settings" className="flex-1 overflow-auto p-6 space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Share Settings</h3>

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Allow comments</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Allow editing</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Show activity log</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Share Link</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="https://runash.ai/collab/abc123xyz"
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <Button size="sm" className="gap-2">
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
