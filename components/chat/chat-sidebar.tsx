"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Trash2, ChevronDown, ChevronRight, RadioTower, SquarePen } from "lucide-react"
import type { ChatSession } from "@/types/runash-chat"

interface ChatSidebarProps {
  sessions: ChatSession[]
  onSessionSelect: (session: ChatSession) => void
  currentSession: ChatSession | null
  onNewChat?: () => void
  onSuggestedPrompts?: () => void
  onImportContext?: () => void
  onDeleteSession?: (sessionId: string) => void
  streamId?: string | null
  activeProjectName?: string | null
  selectedLibraryItemTitle?: string | null
  onNavigateToWorkspaceTool?: () => void
  persistedSessionIds?: string[]
}

export default function ChatSidebar({
  sessions,
  onSessionSelect,
  currentSession,
  onNewChat,
  onSuggestedPrompts,
  onImportContext,
  onDeleteSession,
  streamId,
  activeProjectName,
  selectedLibraryItemTitle,
  onNavigateToWorkspaceTool,
  persistedSessionIds,
}: ChatSidebarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [workspaceToolsOpen, setWorkspaceToolsOpen] = useState(true)

  const persistedSessionIdSet = useMemo(() => new Set(persistedSessionIds ?? []), [persistedSessionIds])
  const persistedSessions = useMemo(() => sessions.filter((session) => persistedSessionIdSet.has(session.id)), [persistedSessionIdSet, sessions])
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredSessions = useMemo(
    () => (normalizedQuery ? persistedSessions.filter((session) => session.title.toLowerCase().includes(normalizedQuery)) : persistedSessions),
    [normalizedQuery, persistedSessions],
  )
  const isSearching = normalizedQuery.length > 0

  const handleNewChat = () => {
    onNewChat?.()
  }

  const handleDeleteSession = (sessionId: string) => {
    onDeleteSession?.(sessionId)
  }

  const buildWorkspaceHref = (path: string) => {
    const params = new URLSearchParams()
    if (currentSession?.id) {
      params.set("sessionId", currentSession.id)
    }
    if (streamId) {
      params.set("streamId", streamId)
    }
    if (activeProjectName) {
      params.set("projectName", activeProjectName)
    }
    if (selectedLibraryItemTitle) {
      params.set("libraryItemTitle", selectedLibraryItemTitle)
    }
    const query = params.toString()
    return query ? `${path}?${query}` : path
  }

  const openWorkspaceTool = (path: string) => {
    router.push(buildWorkspaceHref(path))
    onNavigateToWorkspaceTool?.()
  }

  const getSessionIcon = (session: ChatSession) => {
    if (session.context.preferences.businessType) {
      return "🏪"
    }
    if (session.context.recentSearches.some((search) => search.includes("recipe") || search.includes("cook"))) {
      return "👨‍🍳"
    }
    if (session.context.preferences.sustainabilityPriority === "high") {
      return "🌱"
    }
    return "💬"
  }

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Chat History</CardTitle>
          <Button size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="space-y-3 p-3">
            <section className="rounded-lg border bg-muted/20">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setWorkspaceToolsOpen((prev) => !prev)}
                aria-expanded={workspaceToolsOpen}
              >
                <span className="text-sm font-medium">Workspace tools</span>
                {workspaceToolsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {workspaceToolsOpen ? (
                <div className="space-y-2 border-t px-3 pb-3 pt-2">
                  <button
                    type="button"
                    className="w-full rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/60"
                    onClick={() => openWorkspaceTool("/dashboard/editor")}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <SquarePen className="h-4 w-4" />
                      Connect tools: Editor
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {activeProjectName ? <Badge variant="secondary">Project: {activeProjectName}</Badge> : null}
                      {selectedLibraryItemTitle ? <Badge variant="secondary">Library: {selectedLibraryItemTitle}</Badge> : null}
                      {currentSession?.id ? <Badge variant="outline">Session linked</Badge> : <Badge variant="outline">No session</Badge>}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/60"
                    onClick={() => openWorkspaceTool("/dashboard/streaming-studio")}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <RadioTower className="h-4 w-4" />
                      Connect tools: Streaming Studio
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {streamId ? <Badge variant="secondary">Stream available</Badge> : <Badge variant="outline">No active stream</Badge>}
                      {selectedLibraryItemTitle ? <Badge variant="outline">Library linked</Badge> : null}
                      {currentSession?.id ? <Badge variant="outline">Session linked</Badge> : null}
                    </div>
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/60"
                    onClick={() => openWorkspaceTool("/dashboard/library")}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Search className="h-4 w-4" />
                      Connect tools: Library
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedLibraryItemTitle ? <Badge variant="secondary">Selected: {selectedLibraryItemTitle}</Badge> : <Badge variant="outline">Browse items</Badge>}
                    </div>
                  </button>
                </div>
              ) : null}
            </section>

            {persistedSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm">
                <p className="font-medium">No chats yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You don&apos;t have any saved sessions yet. Create new chat, try starter prompts, or connect tools.
                </p>
                <div className="mt-3 grid gap-2">
                  <Button size="sm" onClick={handleNewChat}>
                    <Plus className="mr-1 h-4 w-4" /> Create new chat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onSuggestedPrompts?.()}>
                    Try starter prompts
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onImportContext?.()}>
                    Connect tools
                  </Button>
                </div>
              </div>
            ) : null}

            {persistedSessions.length > 0 && filteredSessions.length === 0 && isSearching ? (
              <div className="rounded-lg border border-dashed p-4 text-sm">
                <p className="font-medium">No results</p>
                <p className="mt-1 text-xs text-muted-foreground">No saved sessions match “{searchQuery.trim()}”. Try a different title or start a new chat.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleNewChat}>
                  <Plus className="mr-1 h-4 w-4" /> New chat
                </Button>
              </div>
            ) : null}

            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  currentSession?.id === session.id ? "bg-muted border-orange-500" : ""
                }`}
                onClick={() => onSessionSelect(session)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg">{getSessionIcon(session)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{session.title}</h4>
                    <p className="text-xs text-muted-foreground">{session.updatedAt.toLocaleDateString()}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {session.context.preferences.businessType && (
                        <Badge variant="outline" className="text-xs">
                          Business
                        </Badge>
                      )}
                      {session.context.preferences.sustainabilityPriority === "high" && (
                        <Badge variant="outline" className="text-xs">
                          Eco-focused
                        </Badge>
                      )}
                      {session.context.preferences.dietaryRestrictions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Dietary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
