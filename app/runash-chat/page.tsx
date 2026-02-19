"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOutWithRedirect, useAuthSession } from "@/lib/auth/access-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowRight,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FolderKanban,
  Home,
  LayoutTemplate,
  Library,
  Menu,
  MessageSquare,
  MoreVertical,
  PackageSearch,
  PanelsTopLeft,
  LifeBuoy,
  LogOut,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  User,
  X,
} from "lucide-react"

type ChatPreviewMessage = {
  id: string | number
  role: "assistant" | "user"
  content: string
  created_at?: string
}

type ChatQuickPrompt = {
  id: string
  label: string
  description: string
  prompt: string
  icon: React.ComponentType<{ className?: string }>
}

type RecentItem = {
  id: string
  title: string
}

type RecentEntity = {
  id: string
  title: string
  updatedAt: string | null
  entityType: "session" | "project"
  sessionId?: string
}

type OnboardingSlide = {
  title: string
  description: string
  media?: string
}

const runashChatOnboardingStorageKey = "runash_chat_onboarding_seen"
const runashChatSidebarCollapsedStorageKey = "runash_chat_sidebar_collapsed"
const runashChatUpdatesBannerHiddenStorageKey = "runash_updates_banner_hidden"

const onboardingSlides: OnboardingSlide[] = [
  {
    title: "Welcome to RunAsh Chat",
    description: "Plan campaigns, build bundles, and launch storefront workflows from one assistant workspace.",
    media: "✨",
  },
  {
    title: "Use guided prompts",
    description: "Start with quick actions for checkout, bundles, and post-purchase support to move faster.",
    media: "🧭",
  },
  {
    title: "Stay in control",
    description: "Track recents, jump back into sessions, and use the sidebar to keep launches organized.",
  },
]

type HeaderAction = {
  id: "upgrade" | "feedback" | "refer"
  label: string
  tooltip: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
}

const sidebarNavItems = [
  { label: "Home", icon: Home },
  { label: "Library", icon: Library },
  { label: "Projects", icon: FolderKanban },
  { label: "Design Systems", icon: PanelsTopLeft },
  { label: "Templates", icon: LayoutTemplate },
]

export default function RunashChatPage() {
  const router = useRouter()
  const { data: session } = useAuthSession()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messagesPreview, setMessagesPreview] = useState<ChatPreviewMessage[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loadingRecents, setLoadingRecents] = useState(false)
  const [recentItemsError, setRecentItemsError] = useState<string | null>(null)
  const [recentEntities, setRecentEntities] = useState<RecentEntity[]>([])
  const [prompt, setPrompt] = useState("")
  const [startChatError, setStartChatError] = useState<string | null>(null)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [mobileSearchValue, setMobileSearchValue] = useState("")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showUpdatesBanner, setShowUpdatesBanner] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [activeOnboardingStep, setActiveOnboardingStep] = useState(0)
  const mobileSidebarTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mainControlsRef = useRef<HTMLInputElement | null>(null)

  const isLastOnboardingStep = activeOnboardingStep === onboardingSlides.length - 1
  const currentOnboardingSlide = onboardingSlides[activeOnboardingStep]

  const headerActions: HeaderAction[] = [
    {
      id: "upgrade",
      label: "Upgrade",
      tooltip: "View upgrade plans",
      icon: Rocket,
      href: "/pricing",
    },
    {
      id: "feedback",
      label: "Feedback",
      tooltip: "Share product feedback",
      icon: MessageSquare,
      onClick: () => router.push("/contact?topic=feedback&entry=runash-chat"),
    },
    {
      id: "refer",
      label: "Refer",
      tooltip: "Refer a friend or team",
      icon: Sparkles,
      onClick: () => router.push("/partners?program=referral"),
    },
  ]

  const primaryMobileHeaderActions = headerActions.slice(0, 2)
  const overflowMobileHeaderActions = headerActions.slice(2)

  const userDisplayName = session?.user?.name?.trim() || "Guest User"
  const userEmail = session?.user?.email?.trim() || ""
  const userInitials = userDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase())
    .join("") || "GU"

  const userMenuItems = [
    { label: "Profile", icon: User, href: "/settings/profile" },
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Billing", icon: CreditCard, href: "/settings/billing" },
    { label: "Help", icon: LifeBuoy, href: "/support" },
  ]

  const handleUserMenuNavigation = (href: string) => {
    router.push(href)
  }

  const handleHeaderActionClick = (action: HeaderAction) => {
    if (action.href) {
      router.push(action.href)
      return
    }
    action.onClick?.()
  }

  useEffect(() => {
    const savedValue = localStorage.getItem(runashChatSidebarCollapsedStorageKey)
    setIsSidebarCollapsed(savedValue === "true")

    const isBannerHidden = localStorage.getItem(runashChatUpdatesBannerHiddenStorageKey) === "true"
    setShowUpdatesBanner(!isBannerHidden)

    const hasSeenOnboarding = localStorage.getItem(runashChatOnboardingStorageKey) === "true"
    setIsOnboardingOpen(!hasSeenOnboarding)
  }, [])

  const markOnboardingSeen = () => {
    localStorage.setItem(runashChatOnboardingStorageKey, "true")
  }

  const restoreFocusToMainControls = () => {
    mainControlsRef.current?.focus()
  }

  const handleOnboardingOpenChange = (open: boolean) => {
    setIsOnboardingOpen(open)
    if (!open) {
      markOnboardingSeen()
      restoreFocusToMainControls()
    }
  }

  const handleOnboardingNext = () => {
    if (isLastOnboardingStep) {
      markOnboardingSeen()
      setIsOnboardingOpen(false)
      restoreFocusToMainControls()
      return
    }

    setActiveOnboardingStep((previousStep) => Math.min(previousStep + 1, onboardingSlides.length - 1))
  }

  useEffect(() => {
    localStorage.setItem(runashChatSidebarCollapsedStorageKey, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  useEffect(() => {
    if (!isOnboardingOpen) return

    setIsMobileSidebarOpen(false)
    setIsMobileSearchOpen(false)
  }, [isOnboardingOpen])

  useEffect(() => {
    if (!startChatError) return

    const timeoutId = window.setTimeout(() => {
      setStartChatError(null)
    }, 3500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [startChatError])

  const quickPrompts: ChatQuickPrompt[] = [
    {
      id: "bundle",
      label: "Build Bundle",
      description: "Create high-conversion bundles with upsells",
      prompt: "Create a high-converting organic breakfast bundle and suggest two upsells under $30.",
      icon: ShoppingCart,
    },
    {
      id: "checkout",
      label: "Checkout Assist",
      description: "Guide payment and reduce checkout drop-off",
      prompt: "Act as checkout assistant and help complete a secure payment with cart summary and next steps.",
      icon: CreditCard,
    },
    {
      id: "order-followup",
      label: "Post-Purchase",
      description: "Handle order updates and support questions",
      prompt: "Handle a post-purchase support request: order tracking, ETA, and return options.",
      icon: PackageSearch,
    },
  ]

  useEffect(() => {
    ;(async () => {
      setLoadingRecents(true)
      setRecentItemsError(null)
      setLoadingSession(true)
      setPreviewError(null)
      try {
        const sessionsResponse = await fetch("/api/sessions")
        const sessionsPayload = await sessionsResponse.json().catch(() => null)
        const projectsResponse = await fetch("/api/editor/projects")
        const projectsPayload = await projectsResponse.json().catch(() => null)

        if (!sessionsResponse.ok || !sessionsPayload?.success || !Array.isArray(sessionsPayload?.data)) {
          throw new Error(sessionsPayload?.error?.message || "Unable to load recent chats")
        }

        const normalizedRecentItems = sessionsPayload.data
          .map((session: { id?: string | number; title?: string }) => {
            const id = session?.id != null ? String(session.id) : ""
            const title = typeof session?.title === "string" ? session.title.trim() : ""
            if (!id) return null
            return {
              id,
              title: title || `Session #${id}`,
            }
          })
          .filter((item: RecentItem | null): item is RecentItem => item !== null)

        setRecentItems(normalizedRecentItems.slice(0, 8))

        const normalizedRecentEntities: RecentEntity[] = [
          ...sessionsPayload.data
            .map((session: { id?: string | number; title?: string; created_at?: string }) => {
              const id = session?.id != null ? String(session.id) : ""
              if (!id) return null

              return {
                id: `session-${id}`,
                title: typeof session?.title === "string" && session.title.trim() ? session.title.trim() : `Session #${id}`,
                updatedAt: typeof session?.created_at === "string" ? session.created_at : null,
                entityType: "session" as const,
                sessionId: id,
              }
            })
            .filter((item: RecentEntity | null): item is RecentEntity => item !== null),
          ...(projectsResponse.ok && Array.isArray(projectsPayload?.projects)
            ? projectsPayload.projects
                .map((project: { id?: string | number; name?: string; updated_at?: string }) => {
                  const id = project?.id != null ? String(project.id) : ""
                  if (!id) return null

                  return {
                    id: `project-${id}`,
                    title: typeof project?.name === "string" && project.name.trim() ? project.name.trim() : `Project #${id}`,
                    updatedAt: typeof project?.updated_at === "string" ? project.updated_at : null,
                    entityType: "project" as const,
                  }
                })
                .filter((item: RecentEntity | null): item is RecentEntity => item !== null)
            : []),
        ]
          .sort((a, b) => {
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
            return bTime - aTime
          })
          .slice(0, 12)

        setRecentEntities(normalizedRecentEntities)
      } catch (error) {
        setRecentItemsError(error instanceof Error ? error.message : "Unable to load recent chats")
        setRecentItems([])
        setRecentEntities([])
      } finally {
        setLoadingRecents(false)
      }

      try {
        const res = await fetch("/api/sessions/recent")
        const payload = await res.json()
        if (!res.ok || !payload?.success || !payload?.data?.id) {
          throw new Error(payload?.error?.message || "No recent session")
        }

        const recentSession = payload.data
        setSessionId(String(recentSession.id))

        const msgs = await fetch(`/api/messages/session/${recentSession.id}?limit=6`)
        if (!msgs.ok) {
          const messagePayload = await msgs.json().catch(() => null)
          throw new Error(messagePayload?.error?.message || "Unable to load message preview")
        }

        const messagePayload = await msgs.json()
        const preview = Array.isArray(messagePayload?.data) ? (messagePayload.data as ChatPreviewMessage[]) : []
        setMessagesPreview(preview)
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : "Unable to load chat preview")
        setMessagesPreview([])
      } finally {
        setLoadingSession(false)
      }
    })()
  }, [])

  function startChatWithPrompt(initialPrompt?: string) {
    ;(async () => {
      const cleanPrompt = initialPrompt?.trim()
      try {
        let sid = sessionId
        if (!sid) {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "RunAsh Chat" }),
          })
          const created = await res.json()
          sid = created?.id ? String(created.id) : null
          setSessionId(sid ?? null)
        }

        if (cleanPrompt) {
          localStorage.setItem("runash_initial_prompt", cleanPrompt)
        }

        setStartChatError(null)

        router.push(sid ? `/chat?sessionId=${sid}` : "/chat")
      } catch (error) {
        setStartChatError("Couldn’t resume session, opening chat directly.")
        console.warn("Failed to start chat session; using direct chat fallback", {
          hasSessionId: Boolean(sessionId),
          hasInitialPrompt: Boolean(cleanPrompt),
          errorType: error instanceof Error ? error.name : "unknown",
        })
        router.push("/chat")
      }
    })()
  }

  const mobileRecentMatches = recentItems.filter((item) => item.title.toLowerCase().includes(mobileSearchValue.trim().toLowerCase()))
  const recentProjectItems = recentEntities.filter((item) => item.entityType === "project")
  const myChatItems = recentEntities.filter((item) => item.entityType === "session")

  const handleProjectOpen = (projectId: string) => {
    router.push(`/editor?projectId=${projectId}`)
  }

  const handleChatOpen = (chatSessionId?: string) => {
    if (!chatSessionId) return
    router.push(`/chat?sessionId=${chatSessionId}`)
  }

  const dismissUpdatesBanner = () => {
    localStorage.setItem(runashChatUpdatesBannerHiddenStorageKey, "true")
    setShowUpdatesBanner(false)
  }

  const handleMobileSidebarOpenChange = (open: boolean) => {
    setIsMobileSidebarOpen(open)

    if (open) {
      setIsMobileSearchOpen(false)
    }

    if (!open) {
      window.requestAnimationFrame(() => {
        mobileSidebarTriggerRef.current?.focus()
      })
    }
  }

  function renderSidebarContent(collapsed: boolean, isMobileDrawer = false) {
    return (
      <>
        <Button
          className={`mb-3 ${collapsed ? "justify-center px-0" : "justify-start"} bg-zinc-900 hover:bg-zinc-800`}
          onClick={() => {
            startChatWithPrompt()
            if (isMobileDrawer) setIsMobileSidebarOpen(false)
          }}
          aria-label="Start a new chat"
        >
          <Plus className={`h-4 w-4 ${collapsed ? "mr-0" : "mr-2"}`} />
          {!collapsed && "New Chat"}
        </Button>

        {!collapsed && (
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <Input className="border-zinc-800 bg-zinc-950 pl-8 text-zinc-200" placeholder="Search" />
          </div>
        )}

        <TooltipProvider delayDuration={150}>
          <nav className="space-y-1 text-sm" aria-label="Primary">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon

              const navButton = (
                <button
                  key={item.label}
                  className={`flex w-full items-center rounded-md py-2 text-left text-zinc-300 hover:bg-zinc-900 ${
                    collapsed ? "justify-center px-0" : "gap-2 px-2"
                  }`}
                  aria-label={collapsed ? item.label : undefined}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {!collapsed && item.label}
                </button>
              )

              if (!collapsed) {
                return navButton
              }

              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                  <TooltipContent side="right" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>
        </TooltipProvider>

        <div className="mt-5 border-t border-zinc-800 pt-4">
          {!collapsed && <div className="mb-2 text-xs font-medium text-zinc-500">Recents</div>}
          <div className="space-y-1">
            {loadingRecents && <div className={`py-1.5 text-xs text-zinc-500 ${collapsed ? "text-center" : "px-2"}`}>Loading recent chats…</div>}
            {!loadingRecents && recentItemsError && (
              <div className={`py-1.5 text-xs text-amber-400 ${collapsed ? "text-center" : "px-2"}`}>{recentItemsError}</div>
            )}
            {!loadingRecents && !recentItemsError && recentItems.length === 0 && (
              <div className={`py-1.5 text-xs text-zinc-500 ${collapsed ? "text-center" : "px-2"}`}>No recent chats yet</div>
            )}
            {recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  router.push(`/chat?sessionId=${item.id}`)
                  if (isMobileDrawer) setIsMobileSidebarOpen(false)
                }}
                className={`w-full truncate rounded-md py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 ${collapsed ? "px-1 text-center" : "px-2 text-left"}`}
                title={collapsed ? item.title : undefined}
              >
                {collapsed ? item.title.slice(0, 1).toUpperCase() : item.title}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#030405] text-zinc-100">
      <Dialog open={isOnboardingOpen} onOpenChange={handleOnboardingOpenChange}>
        <DialogContent
          className="max-w-md border-zinc-800 bg-zinc-950 p-0 text-zinc-100 motion-reduce:duration-0"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            restoreFocusToMainControls()
          }}
        >
          <div className="overflow-hidden rounded-lg">
            <div className="h-44 bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-zinc-900 p-6">
              <div
                className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-black/20 text-6xl transition-transform duration-300 motion-reduce:transition-none"
                key={currentOnboardingSlide.title}
              >
                <span aria-hidden>{currentOnboardingSlide.media ?? "🚀"}</span>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle>{currentOnboardingSlide.title}</DialogTitle>
                <DialogDescription className="text-zinc-300">{currentOnboardingSlide.description}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2" aria-label="Onboarding progress">
                  {onboardingSlides.map((slide, index) => (
                    <button
                      key={slide.title}
                      type="button"
                      onClick={() => setActiveOnboardingStep(index)}
                      className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                        index === activeOnboardingStep ? "bg-cyan-400" : "bg-zinc-600 hover:bg-zinc-500"
                      }`}
                      aria-label={`Go to onboarding step ${index + 1}`}
                      aria-current={index === activeOnboardingStep ? "step" : undefined}
                    />
                  ))}
                </div>

                <Button className="bg-cyan-600 text-white hover:bg-cyan-500" onClick={handleOnboardingNext}>
                  {isLastOnboardingStep ? "Get started" : "Next"}
                  {!isLastOnboardingStep ? <ArrowRight className="ml-1 h-4 w-4" /> : null}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-3 py-3">
        <aside
          id="runash-chat-sidebar"
          className={`hidden h-[calc(100vh-24px)] shrink-0 rounded-xl border border-zinc-800 bg-black/70 p-3 lg:flex lg:flex-col ${
            isSidebarCollapsed ? "w-[80px]" : "w-[250px]"
          }`}
          aria-label="Sidebar"
        >
          <div className={`mb-2 flex ${isSidebarCollapsed ? "justify-center" : "justify-end"}`}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-expanded={!isSidebarCollapsed}
              aria-controls="runash-chat-sidebar"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </Button>
          </div>
          {renderSidebarContent(isSidebarCollapsed)}
        </aside>

        <main className="h-[calc(100vh-24px)] flex-1 rounded-xl border border-zinc-800 bg-[#050607] p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
            <div className="mb-4 space-y-3 lg:hidden">
              <div className="relative z-10 grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-11 w-11 border-zinc-700 bg-zinc-950 text-zinc-100"
                    onClick={() => router.push("/")}
                    aria-label="Go to home"
                    disabled={isOnboardingOpen}
                  >
                    <Home className="h-4 w-4" />
                  </Button>

                  <Sheet open={isMobileSidebarOpen} onOpenChange={handleMobileSidebarOpenChange}>
                    <SheetTrigger asChild>
                      <Button
                        ref={mobileSidebarTriggerRef}
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-11 w-11 border-zinc-700 bg-zinc-950 text-zinc-100"
                        aria-expanded={isMobileSidebarOpen}
                        aria-controls="runash-chat-mobile-sidebar"
                        aria-label="Open navigation menu"
                        disabled={isOnboardingOpen}
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      id="runash-chat-mobile-sidebar"
                      className="w-[280px] border-zinc-800 bg-[#050607] p-3 text-zinc-100"
                      onEscapeKeyDown={() => setIsMobileSidebarOpen(false)}
                      onCloseAutoFocus={(event) => {
                        event.preventDefault()
                        mobileSidebarTriggerRef.current?.focus()
                      }}
                    >
                      <SheetTitle className="sr-only">Chat navigation</SheetTitle>
                      {renderSidebarContent(false, true)}
                    </SheetContent>
                  </Sheet>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSearchOpen((open) => !open)
                    setIsMobileSidebarOpen(false)
                  }}
                  aria-expanded={isMobileSearchOpen}
                  aria-controls="mobile-chat-search"
                  className="flex h-11 min-w-0 items-center justify-between rounded-full border border-zinc-700 bg-zinc-950 px-3.5 text-left"
                  disabled={isOnboardingOpen}
                >
                  <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">RunAsh</span>
                  <span className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                    <Search className="h-3.5 w-3.5" />
                    Search
                  </span>
                </button>

                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    className="h-11 w-11 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => startChatWithPrompt()}
                    aria-label="Start a new chat"
                    disabled={isOnboardingOpen}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-11 w-11 border-zinc-700 bg-zinc-950 text-zinc-100"
                        aria-label="More quick actions"
                        disabled={isOnboardingOpen}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-zinc-800 bg-zinc-900 text-zinc-100">
                      {headerActions.map((action) => (
                        <DropdownMenuItem
                          key={action.id}
                          onClick={() => handleHeaderActionClick(action)}
                          className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={() => router.push("/changelog")}
                        className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                      >
                        Notifications
                      </DropdownMenuItem>
                      {userMenuItems.map((item) => (
                        <DropdownMenuItem
                          key={item.label}
                          onClick={() => handleUserMenuNavigation(item.href)}
                          className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={() => signOutWithRedirect("/")}
                        className="cursor-pointer text-rose-300 focus:bg-rose-500/20 focus:text-rose-200"
                      >
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                <span>{sessionId ? `Session #${sessionId}` : "No session"}</span>
                <span className="truncate">{userDisplayName}</span>
              </div>

              {isMobileSearchOpen && (
                <div id="mobile-chat-search" className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <label htmlFor="mobile-search-input" className="text-xs font-medium text-zinc-300">
                    Search recent chats
                  </label>
                  <Input
                    id="mobile-search-input"
                    value={mobileSearchValue}
                    onChange={(e) => setMobileSearchValue(e.target.value)}
                    className="border-zinc-700 bg-zinc-900 text-zinc-200"
                    placeholder="Search"
                  />
                  {mobileSearchValue.trim() && (
                    <div className="max-h-28 space-y-1 overflow-y-auto">
                      {mobileRecentMatches.length > 0 ? (
                        mobileRecentMatches.slice(0, 4).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => router.push(`/chat?sessionId=${item.id}`)}
                            className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                          >
                            {item.title}
                          </button>
                        ))
                      ) : (
                        <p className="px-1 text-xs text-zinc-500">No matches found.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <header className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 p-2">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">RunAsh Agent Workspace</p>
                  <h1 className="text-xl font-semibold">What do you want to create?</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 md:flex">
                  {headerActions.map((action) => {
                    const Icon = action.icon

                    return (
                      <Button
                        key={action.id}
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 bg-zinc-950 text-zinc-100"
                        onClick={() => handleHeaderActionClick(action)}
                        aria-label={action.label}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {action.label}
                      </Button>
                    )
                  })}
                </div>

                <TooltipProvider delayDuration={150}>
                  <div className="flex items-center gap-1 md:hidden">
                    {primaryMobileHeaderActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <Tooltip key={action.id}>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-zinc-700 bg-zinc-950 text-zinc-100"
                              onClick={() => handleHeaderActionClick(action)}
                              aria-label={action.label}
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="border-zinc-800 bg-zinc-900 text-zinc-100">{action.tooltip}</TooltipContent>
                        </Tooltip>
                      )
                    })}

                    {overflowMobileHeaderActions.length > 0 && (
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-zinc-700 bg-zinc-950 text-zinc-100"
                                aria-label="More actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent className="border-zinc-800 bg-zinc-900 text-zinc-100">More actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                          {overflowMobileHeaderActions.map((action) => (
                            <DropdownMenuItem
                              key={action.id}
                              onClick={() => handleHeaderActionClick(action)}
                              className="focus:bg-zinc-800 focus:text-zinc-100"
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TooltipProvider>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 rounded-full border-zinc-700 bg-zinc-950 p-0 text-zinc-100"
                      aria-label="Open account menu"
                    >
                      <Avatar className="h-8 w-8">
                        {session?.user?.image ? <AvatarImage src={session.user.image} alt={userDisplayName} /> : null}
                        <AvatarFallback className="bg-zinc-800 text-xs text-zinc-100">{userInitials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-zinc-800 bg-zinc-900 text-zinc-100">
                    <div className="px-2 py-1.5">
                      <p className="truncate text-sm font-medium text-zinc-100">{userDisplayName}</p>
                      {userEmail ? <p className="truncate text-xs text-zinc-400">{userEmail}</p> : null}
                    </div>
                    {userMenuItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <DropdownMenuItem
                          key={item.label}
                          onClick={() => handleUserMenuNavigation(item.href)}
                          className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuItem
                      onClick={() => signOutWithRedirect("/")}
                      className="cursor-pointer text-rose-300 focus:bg-rose-500/20 focus:text-rose-200"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {startChatError && (
              <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {startChatError}
              </div>
            )}

            {showUpdatesBanner && (
              <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-cyan-200/60 bg-cyan-300/10 px-2.5 py-2 text-[11px] text-cyan-50 sm:mb-3 sm:items-center sm:px-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 leading-tight sm:gap-2">
                  <span className="rounded-full border border-cyan-100/70 bg-cyan-200/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-50">
                    New
                  </span>
                  <p className="text-cyan-50">Chat composer updates are live with quicker launch actions.</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-[11px] font-medium text-cyan-100 underline underline-offset-2 hover:text-cyan-50"
                    onClick={() => router.push("/changelog")}
                  >
                    Learn more
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 shrink-0 text-cyan-100 hover:bg-cyan-400/20 hover:text-cyan-50"
                  onClick={dismissUpdatesBanner}
                  aria-label="Dismiss updates banner"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <Card className="mb-5 border-zinc-800 bg-zinc-950 p-4">
              <Input
                ref={mainControlsRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask RunAsh to plan a launch, bundle products, or assist checkout..."
                className="mb-3 border-zinc-700 bg-zinc-900 text-zinc-200"
              />
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => startChatWithPrompt(item.prompt)}
                      className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-zinc-800"
                    >
                      <Icon className="h-3.5 w-3.5 text-cyan-400" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button className="bg-cyan-600 text-white hover:bg-cyan-500" disabled={!prompt.trim()} onClick={() => startChatWithPrompt(prompt)}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>

            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">Recent chats</h2>
                  <span className="text-xs text-zinc-500">View all</span>
                </div>
                <ScrollArea className="h-[260px]">
                  <div className="space-y-2 pr-2">
                    {loadingSession && <div className="text-sm text-zinc-500">Loading preview…</div>}
                    {!loadingSession && previewError && <div className="text-sm text-amber-400">{previewError}</div>}
                    {!loadingSession && !previewError && messagesPreview.length === 0 && (
                      <div className="text-sm text-zinc-500">No messages yet. Start a chat to see history.</div>
                    )}
                    {messagesPreview.map((message) => (
                      <div key={message.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
                        <div className="mb-1 text-xs font-medium text-cyan-400">{message.role === "assistant" ? "RunAsh Agent" : "You"}</div>
                        <p className="line-clamp-2 text-xs text-zinc-300">{message.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <h2 className="mb-3 text-sm font-medium text-zinc-100">Commerce assistant modes</h2>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-emerald-400" /> Product discovery & bundling</li>
                  <li className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-400" /> Checkout guidance</li>
                  <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-400" /> Safe payment handoff</li>
                  <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-orange-400" /> Personalized upsells</li>
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-100" onClick={() => router.push("/payment/runash-pay")}>RunAsh Pay</Button>
                  <Button className="bg-zinc-100 text-zinc-900 hover:bg-white" onClick={() => startChatWithPrompt("Help me complete checkout with best payment option and order confirmation steps.")}>Launch flow</Button>
                </div>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">Recent Projects</h2>
                  <button type="button" className="text-xs text-zinc-500 transition hover:text-zinc-300" onClick={() => router.push("/editor")}>
                    View All
                  </button>
                </div>

                {loadingRecents ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`project-loading-${index}`} className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                        <div className="mb-2 h-3 w-2/3 rounded bg-zinc-800/80" />
                        <div className="mb-3 h-3 w-4/5 rounded bg-zinc-800/70" />
                        <div className="h-20 rounded-md border border-dashed border-zinc-800 bg-zinc-900/70" />
                      </div>
                    ))}
                  </div>
                ) : recentItemsError ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{recentItemsError}</div>
                ) : recentProjectItems.length === 0 ? (
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-4 text-xs text-zinc-500">No recent projects yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {recentProjectItems.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleProjectOpen(item.id.replace("project-", ""))}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900/70"
                      >
                        <div className="mb-2 h-3 w-2/3 rounded bg-zinc-800/80" />
                        <p className="mb-3 truncate text-xs text-zinc-300">{item.title}</p>
                        <div className="h-20 rounded-md border border-dashed border-zinc-800 bg-zinc-900/70" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">My Chats</h2>
                  <button type="button" className="text-xs text-zinc-500 transition hover:text-zinc-300" onClick={() => router.push("/chat")}>
                    View All
                  </button>
                </div>

                {loadingRecents ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`chat-loading-${index}`} className="flex animate-pulse items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                        <div className="h-7 w-7 rounded-full bg-zinc-800/80" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-4/5 rounded bg-zinc-800/70" />
                          <div className="h-2 w-2/5 rounded bg-zinc-800/60" />
                        </div>
                        <div className="h-2 w-10 rounded bg-zinc-800/60" />
                      </div>
                    ))}
                  </div>
                ) : recentItemsError ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{recentItemsError}</div>
                ) : myChatItems.length === 0 ? (
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-4 text-xs text-zinc-500">No chats yet. Start one from above.</div>
                ) : (
                  <div className="space-y-2">
                    {myChatItems.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleChatOpen(item.sessionId)}
                        className="flex w-full items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                      >
                        <div className="h-7 w-7 rounded-full bg-zinc-800/80" />
                        <div className="flex-1">
                          <p className="truncate text-xs text-zinc-300">{item.title}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Open</span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
