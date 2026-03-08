"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Users, Plus, X, Edit3, Check, AlertCircle, Activity, Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { connectRealtimeSubscriber } from "@/lib/realtime/client"
import type { RealtimeEvent } from "@/services/realtime/types"

interface Collaborator {
  id: string
  memberId: string
  userId?: string | null
  name: string
  email: string
  avatar?: string | null
  status: "online" | "idle" | "offline"
  role: "owner" | "editor" | "viewer"
  lastActive: Date
  isCurrentUser: boolean
}

interface ActivityLog {
  id: string
  user: string
  action: string
  timestamp: Date
  type: "edit" | "comment" | "collaboration" | "system"
  details?: string
}

interface CollaborationSettingsState {
  allowComments: boolean
  allowEditing: boolean
  showActivityLog: boolean
}

const DEFAULT_COLLABORATION_SETTINGS: CollaborationSettingsState = {
  allowComments: true,
  allowEditing: true,
  showActivityLog: true,
}

interface CollaborationPanelProps {
  isOpen: boolean
  onClose: () => void
  projectId: string | null
  currentUser: {
    id: string
    name?: string
  } | null
}

type CollaborationApiPayload = {
  activityVisible?: boolean
  pendingInvites?: Array<{
    id: string
    email: string
    role: "editor" | "viewer"
    token: string
    status: "pending" | "accepted" | "revoked" | "expired"
    expires_at: string
  }>
  collaborators: Array<{
    id: string
    memberId: string
    userId?: string | null
    name: string
    email: string
    avatar?: string | null
    status: "online" | "idle" | "offline"
    role: "owner" | "editor" | "viewer"
    lastActive: string
    isCurrentUser: boolean
  }>
  activity: Array<{
    id: string
    user: string
    action: string
    timestamp: string
    type: "edit" | "comment" | "collaboration" | "system"
    details?: string
  }>
}

function normalizeCollaborators(data: CollaborationApiPayload["collaborators"]): Collaborator[] {
  return data.map((entry) => ({
    ...entry,
    lastActive: new Date(entry.lastActive),
  }))
}

function normalizeActivity(data: CollaborationApiPayload["activity"]): ActivityLog[] {
  return data.map((entry) => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  }))
}

export default function CollaborationPanel({ isOpen, onClose, projectId, currentUser }: CollaborationPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor")
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [revokingMemberId, setRevokingMemberId] = useState<string | null>(null)
  const [isRealtimeConnecting, setIsRealtimeConnecting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const [settings, setSettings] = useState<CollaborationSettingsState>(DEFAULT_COLLABORATION_SETTINGS)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [copyLinkLabel, setCopyLinkLabel] = useState("Copy Link")
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null)

  const fetchCollaborationState = useCallback(async () => {
    if (!projectId) return

    setFetchError(null)
    setIsInitialLoading(true)

    try {
      const response = await fetch(`/api/editor/projects/${encodeURIComponent(projectId)}/collaboration`, { method: "GET" })
      if (!response.ok) {
        throw new Error("Failed to load collaboration state")
      }

      const payload = (await response.json()) as CollaborationApiPayload
      setCollaborators(normalizeCollaborators(payload.collaborators))
      setActivityLog(normalizeActivity(payload.activity))
      if (payload.activityVisible === false) {
        setSettings((previous) => ({ ...previous, showActivityLog: false }))
      }

      const settingsResponse = await fetch(`/api/editor/projects/${encodeURIComponent(projectId)}/collaboration/settings`, {
        method: "GET",
      })
      if (settingsResponse.ok) {
        const settingsPayload = (await settingsResponse.json()) as { settings?: CollaborationSettingsState }
        if (settingsPayload.settings) {
          setSettings(settingsPayload.settings)
        }
      }
    } catch {
      setFetchError("Could not load collaboration members and activity.")
    } finally {
      setIsInitialLoading(false)
    }
  }, [projectId])

  const mergePresenceEvent = useCallback(
    (event: RealtimeEvent<"collaborator.presence">) => {
      if (!projectId || event.payload.projectId !== projectId) return
      const nextStatus = event.payload.state === "join" ? "online" : "offline"
      let actorName = event.payload.userId === currentUser?.id ? currentUser?.name ?? "You" : "Collaborator"

      setCollaborators((previous) =>
        previous.map((entry) => {
          if ((entry.userId ?? entry.id) !== event.payload.userId) {
            return entry
          }

          actorName = entry.name
          return {
            ...entry,
            status: nextStatus,
            lastActive: new Date(event.payload.occurredAt),
          }
        }),
      )

      setActivityLog((previous) => [
        {
          id: `${event.cursor}-presence`,
          user: actorName,
          action: nextStatus === "online" ? "joined the session" : "left the session",
          timestamp: new Date(event.payload.occurredAt),
          type: "collaboration",
        },
        ...previous,
      ])
    },
    [currentUser?.id, currentUser?.name, projectId],
  )

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

  useEffect(() => {
    if (!isOpen || !projectId) return
    void fetchCollaborationState()
  }, [fetchCollaborationState, isOpen, projectId])

  useEffect(() => {
    if (!isOpen || !projectId) return

    let isDisposed = false
    const subscribe = async () => {
      setIsRealtimeConnecting(true)
      setRealtimeError(null)

      try {
        realtimeUnsubscribeRef.current?.()
        const unsubscribe = await connectRealtimeSubscriber({
          channels: [`editor:${projectId}`],
          onEvent: (event) => {
            if (event.type === "collaborator.presence") {
              mergePresenceEvent(event)
            }
          },
          onError: () => {
            if (isDisposed) return
            setRealtimeError("Realtime disconnected. Reconnecting…")
            reconnectTimeoutRef.current = setTimeout(() => {
              void subscribe()
            }, 2000)
          },
        })

        if (isDisposed) {
          unsubscribe()
          return
        }

        realtimeUnsubscribeRef.current = unsubscribe
        setRealtimeError(null)
      } catch {
        if (isDisposed) return
        setRealtimeError("Unable to connect realtime updates. Retrying…")
        reconnectTimeoutRef.current = setTimeout(() => {
          void subscribe()
        }, 2000)
      } finally {
        if (!isDisposed) {
          setIsRealtimeConnecting(false)
        }
      }
    }

    void subscribe()

    return () => {
      isDisposed = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      realtimeUnsubscribeRef.current?.()
      realtimeUnsubscribeRef.current = null
    }
  }, [isOpen, projectId, mergePresenceEvent])

  const handleInviteCollaborator = async () => {
    if (!projectId || !inviteEmail.trim()) return

    setInviteError(null)
    setIsInviting(true)

    try {
      const response = await fetch(`/api/editor/projects/${encodeURIComponent(projectId)}/collaboration/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })

      if (!response.ok) {
        throw new Error("Failed to invite collaborator")
      }

      const payload = (await response.json()) as { invite?: { token?: string }; inviteLink?: string }
      setInviteEmail("")
      const inviteLink = payload.inviteLink ?? (payload.invite?.token ? `/editor/invite/${payload.invite.token}` : null)
      setLatestInviteLink(inviteLink)
      await fetchCollaborationState()
    } catch {
      setInviteError("Could not send invite. Try again.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveCollaborator = async (memberId: string) => {
    if (!projectId) return

    setRevokingMemberId(memberId)
    setRevokeError(null)

    try {
      const response = await fetch(`/api/editor/projects/${encodeURIComponent(projectId)}/collaboration/${encodeURIComponent(memberId)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to revoke collaborator")
      }

      await fetchCollaborationState()
    } catch {
      setRevokeError("Could not revoke access. Please retry.")
    } finally {
      setRevokingMemberId(null)
    }
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

  const updateSetting = async (key: keyof CollaborationSettingsState, value: boolean) => {
    if (!projectId || isSavingSettings) return
    const nextSettings = { ...settings, [key]: value }
    setSettings(nextSettings)
    setSettingsError(null)
    setIsSavingSettings(true)

    try {
      const response = await fetch(`/api/editor/projects/${encodeURIComponent(projectId)}/collaboration/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      })

      if (!response.ok) {
        throw new Error("Failed to update settings")
      }
    } catch {
      setSettingsError("Could not save share settings. Reverting change.")
      setSettings((previous) => ({ ...previous, [key]: !value }))
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleCopyLink = async () => {
    if (!projectId || typeof window === "undefined") return
    const shareLink = `${window.location.origin}/editor?projectId=${projectId}`

    try {
      await navigator.clipboard.writeText(shareLink)
      setCopyLinkLabel("Copied")
      window.setTimeout(() => setCopyLinkLabel("Copy Link"), 1500)
    } catch {
      setCopyLinkLabel("Copy failed")
      window.setTimeout(() => setCopyLinkLabel("Copy Link"), 2000)
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

        {(fetchError || realtimeError || inviteError || revokeError || settingsError || isRealtimeConnecting) && (
          <div className="px-6 py-3 text-sm border-b border-border/70 space-y-1">
            {isRealtimeConnecting && <p className="text-muted-foreground">Connecting realtime…</p>}
            {fetchError && <p className="text-destructive">{fetchError}</p>}
            {inviteError && <p className="text-destructive">{inviteError}</p>}
            {revokeError && <p className="text-destructive">{revokeError}</p>}
            {settingsError && <p className="text-destructive">{settingsError}</p>}
            {realtimeError && <p className="text-orange-500">{realtimeError}</p>}
          </div>
        )}

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

          <TabsContent value="collaborators" className="flex-1 overflow-auto p-6 space-y-4">
            {isInitialLoading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading collaborators…
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-3 pr-4">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.memberId}
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
                          <p className="text-xs text-muted-foreground truncate">{collaborator.email || "No email"}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(collaborator.lastActive)}</p>
                        </div>
                      </div>

                      {!collaborator.isCurrentUser && collaborator.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokingMemberId === collaborator.memberId}
                          onClick={() => handleRemoveCollaborator(collaborator.memberId)}
                          className="ml-2"
                        >
                          {revokingMemberId === collaborator.memberId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

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
                onClick={() => void handleInviteCollaborator()}
                disabled={!projectId || isInviting || !inviteEmail.trim()}
                className="w-full gap-2 bg-gradient-to-r from-primary to-accent"
              >
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Send Invite
              </Button>

              {latestInviteLink && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 p-2 text-xs">
                  <span className="truncate">{latestInviteLink}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(latestInviteLink)
                      } catch {
                        // ignore copy failures
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-auto p-6">
            {!settings.showActivityLog ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Activity log is hidden by current share settings.
              </div>
            ) : isInitialLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading activity…
              </div>
            ) : (
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
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto p-6 space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Share Settings</h3>

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Allow comments</span>
                  <input
                    type="checkbox"
                    checked={settings.allowComments}
                    onChange={(event) => void updateSetting("allowComments", event.target.checked)}
                    disabled={!projectId || isSavingSettings}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Allow editing</span>
                  <input
                    type="checkbox"
                    checked={settings.allowEditing}
                    onChange={(event) => void updateSetting("allowEditing", event.target.checked)}
                    disabled={!projectId || isSavingSettings}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Show activity log</span>
                  <input
                    type="checkbox"
                    checked={settings.showActivityLog}
                    onChange={(event) => void updateSetting("showActivityLog", event.target.checked)}
                    disabled={!projectId || isSavingSettings}
                    className="rounded"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Share Link</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectId ? `https://runash.ai/editor?projectId=${projectId}` : ""}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <Button size="sm" className="gap-2" onClick={() => void handleCopyLink()} disabled={!projectId}>
                    {copyLinkLabel}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
