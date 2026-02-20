"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOutWithRedirect, useAuthSession } from "@/lib/auth/access-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  ExternalLink,
  FolderKanban,
  Home,
  LayoutTemplate,
  Library,
  Menu,
  MessageSquare,
  MoreVertical,
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

type RecentEntity = {
  id: string
  title: string
  updatedAt: string | null
  entityType: "session" | "project"
  sessionId?: string
}

type SidebarFavoriteItem = {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

type OnboardingSlide = {
  title: string
  description: string
  image?: string
}

const runashChatOnboardingStorageKey = "runash_chat_onboarding_seen"
const runashChatSidebarCollapsedStorageKey = "runash_chat_sidebar_collapsed"
const runashChatBannerHiddenStorageKey = "runash_chat_banner_hidden"
const runashChatUpdatesBannerHiddenStorageKey = "runash_chat_updates_hidden"
const runashChatLegacyUpdatesBannerHiddenStorageKey = "runash_updates_banner_hidden"
const runashChatDesktopSidebarContentId = "runash-chat-desktop-sidebar-content"
const runashChatMobileSidebarId = "runash-chat-mobile-sidebar"
const runashChatThemeStorageKey = "runash_chat_preference_theme"
const runashChatLanguageStorageKey = "runash_chat_preference_language"
const runashChatPositionStorageKey = "runash_chat_preference_chat_position"

const themeOptions = ["system", "dark", "light"] as const
const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "hi", label: "हिन्दी" },
] as const
const chatPositionOptions = ["left", "right"] as const

type RunashThemePreference = (typeof themeOptions)[number]
type RunashLanguagePreference = (typeof languageOptions)[number]["value"]
type RunashChatPositionPreference = (typeof chatPositionOptions)[number]

const isValidThemePreference = (value: string | null): value is RunashThemePreference =>
  Boolean(value && themeOptions.includes(value as RunashThemePreference))

const isValidLanguagePreference = (value: string | null): value is RunashLanguagePreference =>
  Boolean(value && languageOptions.some((languageOption) => languageOption.value === value))

const isValidChatPositionPreference = (value: string | null): value is RunashChatPositionPreference =>
  Boolean(value && chatPositionOptions.includes(value as RunashChatPositionPreference))

const onboardingSlides: OnboardingSlide[] = [
  {
    title: "Welcome to RunAsh Chat",
    description: "Plan campaigns, build bundles, and launch storefront workflows from one assistant workspace.",
    image: "✨",
  },
  {
    title: "Use guided prompts",
    description: "Start with quick actions for checkout, bundles, and post-purchase support to move faster.",
    image: "🧭",
  },
  {
    title: "Stay in control",
    description: "Track recents, jump back into sessions, and use the sidebar to keep launches organized.",
    image: "🚀",
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

const sidebarFavoriteItems: SidebarFavoriteItem[] = [
  { id: "projects", label: "Projects", description: "Continue building", icon: FolderKanban, href: "/editor" },
  { id: "templates", label: "Templates", description: "Start from a base", icon: LayoutTemplate, href: "/templates" },
  { id: "library", label: "Library", description: "Saved assets", icon: Library, href: "/library" },
]

export default function RunashChatPage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { data: session, status: authStatus } = useAuthSession()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messagesPreview, setMessagesPreview] = useState<ChatPreviewMessage[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loadingRecents, setLoadingRecents] = useState(false)
  const [recentItemsError, setRecentItemsError] = useState<string | null>(null)
  const [recentEntities, setRecentEntities] = useState<RecentEntity[]>([])
  const [prompt, setPrompt] = useState("")
  const [startChatError, setStartChatError] = useState<string | null>(null)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [mobileSearchValue, setMobileSearchValue] = useState("")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)
  const [isRecentsExpanded, setIsRecentsExpanded] = useState(true)
  const [isLearnMoreDialogOpen, setIsLearnMoreDialogOpen] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean | null>(null)
  const mobileSidebarTriggerRef = useRef<HTMLButtonElement | null>(null)
  const desktopSidebarToggleRef = useRef<HTMLButtonElement | null>(null)
  const learnMoreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mainControlsRef = useRef<HTMLTextAreaElement | null>(null)
  const [selectedModel, setSelectedModel] = useState<"v0 Mini" | "v0 Max">("v0 Mini")
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Select a Project")
  const [themePreference, setThemePreference] = useState<RunashThemePreference>("system")
  const [languagePreference, setLanguagePreference] = useState<RunashLanguagePreference>("en")
  const [chatPositionPreference, setChatPositionPreference] = useState<RunashChatPositionPreference>("left")
  const [isComposerUpgradeHelperDismissed, setIsComposerUpgradeHelperDismissed] = useState(false)

  const isLastOnboardingStep = onboardingStep === onboardingSlides.length - 1
  const currentOnboardingSlide = onboardingSlides[onboardingStep]

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
      onClick: () => router.push("/settings?section=workspace&panel=feedback"),
    },
    {
      id: "refer",
      label: "Refer",
      tooltip: "Refer a friend or team",
      icon: Sparkles,
      onClick: () => router.push("/settings?section=usage&panel=refer-earn"),
    },
  ]

  const primaryMobileHeaderActions = headerActions.slice(0, 2)
  const overflowMobileHeaderActions = headerActions.slice(2)
  const primaryTabletHeaderActions = headerActions.slice(0, 1)
  const overflowTabletHeaderActions = headerActions.slice(1)
  const creditsBalanceLabel = "5.00"

  const authenticatedUser = session?.user
  const isAuthenticated = authStatus === "authenticated" && Boolean(authenticatedUser)
  const userDisplayName = authenticatedUser?.name?.trim() || authenticatedUser?.email?.split("@")[0]?.trim() || "Guest User"
  const userEmail = authenticatedUser?.email?.trim() || ""
  const userAvatar = authenticatedUser?.image?.trim() || ""
  const userInitials = userDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase())
    .join("") || "GU"

  type UserMenuItem = {
    label: string
    icon: React.ComponentType<{ className?: string }>
    href: string
    external?: boolean
  }

  const accountMenuItems: UserMenuItem[] = [
    { label: "Profile", icon: User, href: "/account" },
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Pricing", icon: CreditCard, href: "/pricing" },
    { label: "Documentation", icon: Library, href: "https://docs.runash.io", external: true },
    { label: "Community Forum", icon: LifeBuoy, href: "https://community.runash.io", external: true },
    { label: "Credits", icon: Sparkles, href: "/settings/billing" },
  ]

  const preferenceMenuItems: UserMenuItem[] = [
    { label: "Theme", icon: PanelsTopLeft, href: "/settings?section=preferences&panel=theme" },
    { label: "Language", icon: MessageSquare, href: "/settings?section=preferences&panel=language" },
    { label: "Chat Position", icon: LayoutTemplate, href: "/settings?section=preferences&panel=chat-position" },
  ]

  const handleUserMenuNavigation = (item: UserMenuItem) => {
    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer")
      return
    }

    router.push(item.href)
  }

  const renderProfileMenu = (triggerClassName: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={triggerClassName}
          aria-label="Open account menu"
          aria-haspopup="menu"
        >
          <Avatar className="h-8 w-8">
            {userAvatar ? <AvatarImage src={userAvatar} alt={userDisplayName} /> : null}
            <AvatarFallback className="bg-zinc-800 text-xs text-zinc-100">{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 border-zinc-800 bg-zinc-900 text-zinc-100">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="truncate text-sm font-medium text-zinc-100">{userDisplayName}</p>
          {userEmail ? <p className="truncate text-xs font-normal text-zinc-400">{userEmail}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuLabel className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          {accountMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => handleUserMenuNavigation(item)}
                className="cursor-pointer py-2 focus:bg-zinc-800 focus:text-zinc-100"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
                {item.external ? (
                  <DropdownMenuShortcut>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </DropdownMenuShortcut>
                ) : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuLabel className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Preferences</DropdownMenuLabel>
        <DropdownMenuGroup>
          {preferenceMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.label}
                onSelect={() => handleUserMenuNavigation(item)}
                className="cursor-pointer py-2 focus:bg-zinc-800 focus:text-zinc-100"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuLabel className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Session</DropdownMenuLabel>

        <DropdownMenuItem
          onClick={() => signOutWithRedirect("/")}
          className="cursor-pointer py-2 text-rose-300 focus:bg-rose-500/20 focus:text-rose-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

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

    const isBannerHidden =
      localStorage.getItem(runashChatBannerHiddenStorageKey) === "true" ||
      localStorage.getItem(runashChatUpdatesBannerHiddenStorageKey) === "true" ||
      localStorage.getItem(runashChatLegacyUpdatesBannerHiddenStorageKey) === "true"
    const hasSeenOnboarding = localStorage.getItem(runashChatOnboardingStorageKey) === "true"
    setIsBannerDismissed(isBannerHidden || hasSeenOnboarding)

    if (hasSeenOnboarding) {
      setOnboardingStep(onboardingSlides.length - 1)
    }

    const storedThemePreference = localStorage.getItem(runashChatThemeStorageKey)
    const safeThemePreference: RunashThemePreference = isValidThemePreference(storedThemePreference) ? storedThemePreference : "system"
    setThemePreference(safeThemePreference)
    setTheme(safeThemePreference)

    const storedLanguagePreference = localStorage.getItem(runashChatLanguageStorageKey)
    setLanguagePreference(isValidLanguagePreference(storedLanguagePreference) ? storedLanguagePreference : "en")

    const storedChatPositionPreference = localStorage.getItem(runashChatPositionStorageKey)
    setChatPositionPreference(isValidChatPositionPreference(storedChatPositionPreference) ? storedChatPositionPreference : "left")
  }, [setTheme])

  useEffect(() => {
    localStorage.setItem(runashChatThemeStorageKey, themePreference)
    setTheme(themePreference)
  }, [themePreference, setTheme])

  useEffect(() => {
    localStorage.setItem(runashChatLanguageStorageKey, languagePreference)
  }, [languagePreference])

  useEffect(() => {
    localStorage.setItem(runashChatPositionStorageKey, chatPositionPreference)
  }, [chatPositionPreference])

  const markOnboardingSeen = () => {
    localStorage.setItem(runashChatOnboardingStorageKey, "true")
  }

  const restoreFocusToMainControls = () => {
    if (learnMoreTriggerRef.current instanceof HTMLElement) {
      learnMoreTriggerRef.current.focus()
      return
    }

    mainControlsRef.current?.focus()
  }

  const handleOpenLearnMoreDialog = () => {
    setOnboardingStep(0)
    setIsLearnMoreDialogOpen(true)
  }

  const handleOnboardingOpenChange = (open: boolean) => {
    setIsLearnMoreDialogOpen(open)
    if (!open) {
      restoreFocusToMainControls()
    }
  }

  const handleOnboardingNext = () => {
    if (isLastOnboardingStep) {
      markOnboardingSeen()
      setIsLearnMoreDialogOpen(false)
      setIsBannerDismissed(true)
      restoreFocusToMainControls()
      return
    }

    setOnboardingStep((previousStep) => Math.min(previousStep + 1, onboardingSlides.length - 1))
  }

  useEffect(() => {
    localStorage.setItem(runashChatSidebarCollapsedStorageKey, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  useEffect(() => {
    if (!isLearnMoreDialogOpen) return

    setIsMobileSidebarOpen(false)
    setIsMobileSearchOpen(false)
  }, [isLearnMoreDialogOpen])

  useEffect(() => {
    if (!isMobileSidebarOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isMobileSidebarOpen])

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "b") return

      event.preventDefault()

      if (window.matchMedia("(min-width: 1024px)").matches) {
        setIsSidebarCollapsed((previous) => !previous)
        window.requestAnimationFrame(() => {
          desktopSidebarToggleRef.current?.focus()
        })
        return
      }

      setIsMobileSidebarOpen((previous) => !previous)
    }

    window.addEventListener("keydown", handleKeyboardShortcut)
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcut)
    }
  }, [])

  useEffect(() => {
    if (!startChatError) return

    const timeoutId = window.setTimeout(() => {
      setStartChatError(null)
    }, 3500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [startChatError])

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

  const mobileRecentMatches = recentEntities.filter((item) => item.title.toLowerCase().includes(mobileSearchValue.trim().toLowerCase()))
  const recentProjectItems = recentEntities.filter((item) => item.entityType === "project")
  const myChatItems = recentEntities.filter((item) => item.entityType === "session")
  const sidebarRecents = recentEntities.slice(0, 20)
  const projectThumbnailClasses = [
    "from-cyan-500/30 via-sky-500/20 to-indigo-500/30",
    "from-violet-500/30 via-fuchsia-500/20 to-pink-500/30",
    "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
    "from-orange-500/30 via-amber-500/20 to-yellow-500/30",
  ]

  const handleProjectOpen = (projectId: string) => {
    router.push(`/editor?projectId=${projectId}`)
  }

  const handleChatOpen = (chatSessionId?: string) => {
    if (!chatSessionId) return
    router.push(`/chat?sessionId=${chatSessionId}`)
  }

  const getInitials = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "RA"

  const formatRecentTimestamp = (rawValue: string | null) => {
    if (!rawValue) return "Updated recently"

    const date = new Date(rawValue)
    if (Number.isNaN(date.getTime())) return "Updated recently"

    return `Updated ${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`
  }

  const getRecentStatus = (rawValue: string | null) => {
    if (!rawValue) return "Idle"
    const timestamp = new Date(rawValue).getTime()
    if (Number.isNaN(timestamp)) return "Idle"

    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60)
    if (diffHours < 24) return "Active"
    if (diffHours < 72) return "Recent"
    return "Idle"
  }

  const dismissUpdatesBanner = () => {
    localStorage.setItem(runashChatBannerHiddenStorageKey, "true")
    localStorage.setItem(runashChatUpdatesBannerHiddenStorageKey, "true")
    localStorage.setItem(runashChatLegacyUpdatesBannerHiddenStorageKey, "true")
    setIsBannerDismissed(true)
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

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    if (prompt.trim()) {
      startChatWithPrompt(prompt)
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

        <div className="mt-5 min-h-0 flex-1 border-t border-zinc-800 pt-4">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-2">
              {!collapsed ? (
                <section>
                  <button
                    type="button"
                    className="mb-2 flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300"
                    onClick={() => setIsFavoritesExpanded((prev) => !prev)}
                    aria-expanded={isFavoritesExpanded}
                  >
                    Favorites
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFavoritesExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </button>

                  {isFavoritesExpanded ? (
                    <div className="space-y-1">
                      {sidebarFavoriteItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              router.push(item.href)
                              if (isMobileDrawer) setIsMobileSidebarOpen(false)
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-zinc-900"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-zinc-300">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-zinc-200">{item.label}</p>
                              <p className="truncate text-[11px] text-zinc-500">{item.description}</p>
                            </div>
                            <MoreVertical className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section>
                {!collapsed ? (
                  <button
                    type="button"
                    className="mb-2 flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300"
                    onClick={() => setIsRecentsExpanded((prev) => !prev)}
                    aria-expanded={isRecentsExpanded}
                  >
                    Recents
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isRecentsExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </button>
                ) : null}

                {(collapsed || isRecentsExpanded) && (
                  <div className="space-y-1">
                    {loadingRecents && (
                      <div className={`py-1.5 text-xs text-zinc-500 ${collapsed ? "text-center" : "px-2"}`}>Loading recent workspace items…</div>
                    )}
                    {!loadingRecents && recentItemsError && (
                      <div className={`py-1.5 text-xs text-amber-400 ${collapsed ? "text-center" : "px-2"}`}>{recentItemsError}</div>
                    )}
                    {!loadingRecents && !recentItemsError && sidebarRecents.length === 0 && (
                      <div className={`py-1.5 text-xs text-zinc-500 ${collapsed ? "text-center" : "px-2"}`}>No recent chats or projects</div>
                    )}

                    {sidebarRecents.map((item) => {
                      const isProject = item.entityType === "project"
                      const itemLabel = isProject ? "Project" : "Chat"
                      const Icon = isProject ? FolderKanban : MessageSquare

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (isProject) {
                              handleProjectOpen(item.id.replace("project-", ""))
                            } else {
                              handleChatOpen(item.sessionId)
                            }
                            if (isMobileDrawer) setIsMobileSidebarOpen(false)
                          }}
                          className={`w-full rounded-md py-1.5 transition hover:bg-zinc-900 ${collapsed ? "px-1 text-center" : "px-2 text-left"}`}
                          title={collapsed ? item.title : undefined}
                        >
                          {collapsed ? (
                            <span className="text-xs text-zinc-400">{item.title.slice(0, 1).toUpperCase()}</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900/70 text-zinc-300">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-zinc-200">{item.title}</span>
                                <span className="block truncate text-[11px] text-zinc-500">
                                  {itemLabel} · {formatRecentTimestamp(item.updatedAt)}
                                </span>
                              </span>
                              <span className="shrink-0 rounded p-1 text-zinc-600" aria-hidden>
                                <MoreVertical className="h-3.5 w-3.5" />
                              </span>
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#030405] text-zinc-100">
      <Dialog open={isLearnMoreDialogOpen} onOpenChange={handleOnboardingOpenChange}>
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
                <span aria-hidden>{currentOnboardingSlide.image ?? "🚀"}</span>
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
                      onClick={() => setOnboardingStep(index)}
                      className={`h-2.5 w-2.5 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                        index === onboardingStep ? "bg-cyan-400" : "bg-zinc-600 hover:bg-zinc-500"
                      }`}
                      aria-label={`Go to onboarding step ${index + 1}`}
                      aria-current={index === onboardingStep ? "step" : undefined}
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

      <div
        className={`mx-auto flex w-full max-w-[1400px] gap-4 px-3 py-3 ${chatPositionPreference === "right" ? "lg:flex-row-reverse" : "lg:flex-row"}`}
      >
        <aside
          id="runash-chat-sidebar"
          className={`hidden h-[calc(100vh-24px)] shrink-0 rounded-xl border border-zinc-800 bg-black/70 p-3 lg:flex lg:flex-col ${
            isSidebarCollapsed ? "w-16" : "w-[250px]"
          }`}
          aria-label="Sidebar"
        >
          <div className={`mb-2 flex ${isSidebarCollapsed ? "justify-center" : "justify-end"}`}>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={desktopSidebarToggleRef}
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    aria-expanded={!isSidebarCollapsed}
                    aria-controls={runashChatDesktopSidebarContentId}
                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title="Toggle sidebar (Ctrl/Cmd+B)"
                  >
                    {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                  {isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} (Ctrl/Cmd+B)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div id={runashChatDesktopSidebarContentId}>{renderSidebarContent(isSidebarCollapsed)}</div>
        </aside>

        <main className="h-[calc(100vh-24px)] flex-1 rounded-xl border border-zinc-800 bg-[#050607] p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
            <div className="mb-4 space-y-3 lg:hidden">
              <div
                className={`sticky top-0 ${isMobileSidebarOpen || isLearnMoreDialogOpen ? "z-0" : "z-20"} rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-2 backdrop-blur`}
              >
                <div className="grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-2">
                  <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-[42px] w-[42px] rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100"
                    onClick={() => router.push("/")}
                    aria-label="Go to home"
                    disabled={isLearnMoreDialogOpen}
                  >
                    <Home className="h-[18px] w-[18px] stroke-[1.75]" />
                  </Button>

                  <Sheet open={isMobileSidebarOpen} onOpenChange={handleMobileSidebarOpenChange}>
                    <SheetTrigger asChild>
                      <Button
                        ref={mobileSidebarTriggerRef}
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-[42px] w-[42px] rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100"
                        aria-expanded={isMobileSidebarOpen}
                        aria-controls={runashChatMobileSidebarId}
                        aria-label={isMobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                        disabled={isLearnMoreDialogOpen}
                        title="Toggle navigation (Ctrl/Cmd+B)"
                      >
                        <Menu className="h-[18px] w-[18px] stroke-[1.75]" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side={chatPositionPreference === "right" ? "right" : "left"}
                      id={runashChatMobileSidebarId}
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
                  className="flex h-[42px] min-w-0 items-center justify-between rounded-full border border-zinc-800 bg-zinc-950 px-3.5 text-left"
                  disabled={isLearnMoreDialogOpen}
                >
                  <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">RunAsh Workspace</span>
                  <span className="ml-2 flex shrink-0 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                    <Sparkles className="h-3.5 w-3.5 stroke-[1.75]" />
                    <span className="hidden sm:inline">Search</span>
                  </span>
                </button>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-[42px] w-[42px] rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                      onClick={() => {
                        setIsMobileSearchOpen((open) => !open)
                        setIsMobileSidebarOpen(false)
                      }}
                      aria-label="Toggle mobile search"
                      aria-expanded={isMobileSearchOpen}
                      aria-controls="mobile-chat-search"
                      disabled={isLearnMoreDialogOpen}
                    >
                      <Search className="h-[18px] w-[18px] stroke-[1.75]" />
                    </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-[42px] w-[42px] rounded-xl bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => startChatWithPrompt()}
                    aria-label="Start a new chat"
                    disabled={isLearnMoreDialogOpen}
                  >
                    <Plus className="h-[18px] w-[18px] stroke-[1.75]" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-[42px] w-[42px] rounded-xl border-zinc-800 bg-zinc-950 text-zinc-100"
                        aria-label="More quick actions"
                        disabled={isLearnMoreDialogOpen}
                      >
                        <MoreVertical className="h-[18px] w-[18px] stroke-[1.75]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 border-zinc-800 bg-zinc-900 text-zinc-100">
                      {headerActions.map((action) => {
                        const Icon = action.icon
                        return (
                        <DropdownMenuItem
                          key={action.id}
                          onClick={() => handleHeaderActionClick(action)}
                          className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                        >
                          <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                          {action.label}
                        </DropdownMenuItem>
                        )
                      })}
                      <DropdownMenuItem
                        onClick={() => router.push("/changelog")}
                        className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                      >
                        Notifications
                      </DropdownMenuItem>
                      {accountMenuItems.map((item) => (
                        <DropdownMenuItem
                          key={item.label}
                          onSelect={() => handleUserMenuNavigation(item)}
                          className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isAuthenticated ? (
                    renderProfileMenu("h-[42px] w-[42px] rounded-full border-zinc-800 bg-zinc-950 p-0 text-zinc-100")
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-[42px] rounded-full border-zinc-800 bg-zinc-950 px-4 text-zinc-100"
                      onClick={() => router.push("/login")}
                    >
                      Sign in
                    </Button>
                  )}
                </div>
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
                      {loadingRecents ? (
                        <p className="px-1 text-xs text-zinc-500">Loading recents…</p>
                      ) : recentItemsError ? (
                        <p className="px-1 text-xs text-amber-400">{recentItemsError}</p>
                      ) : mobileRecentMatches.length > 0 ? (
                        mobileRecentMatches.slice(0, 6).map((item) => {
                          const isProject = item.entityType === "project"

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => (isProject ? handleProjectOpen(item.id.replace("project-", "")) : handleChatOpen(item.sessionId))}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900"
                            >
                              <span className="rounded border border-zinc-700 px-1 py-0.5 text-[10px] uppercase text-zinc-500">
                                {isProject ? "Project" : "Chat"}
                              </span>
                              <span className="min-w-0 truncate">{item.title}</span>
                            </button>
                          )
                        })
                      ) : (
                        <p className="px-1 text-xs text-zinc-500">No matches found.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-4 min-h-[52px]">
              {isBannerDismissed === false && (
                <div
                  className="rounded-lg border border-zinc-700/70 bg-zinc-900/80 px-3 py-2 text-zinc-100 backdrop-blur-sm"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed sm:text-sm">
                      <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-200">
                        New
                      </span>
                      <p className="text-zinc-300">Chat composer updates are live with quicker launch actions.</p>
                      <Button
                        variant="link"
                        ref={learnMoreTriggerRef}
                        className="h-auto p-0 text-xs font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200 sm:text-sm"
                        onClick={handleOpenLearnMoreDialog}
                      >
                        Learn More
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 -translate-y-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      onClick={dismissUpdatesBanner}
                      aria-label="Dismiss updates banner"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <header className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 p-1.5 sm:p-2">
                  <Bot className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-400 sm:text-sm">RunAsh Agent Workspace</p>
                  <h1 className="truncate text-lg font-semibold sm:text-xl">What do you want to create?</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <div className="hidden items-center gap-1 lg:flex">
                  {headerActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.id === "upgrade" ? "outline" : "ghost"}
                      className={
                        action.id === "upgrade"
                          ? "border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                      }
                      onClick={() => handleHeaderActionClick(action)}
                      aria-label={action.label}
                    >
                      <action.icon className="mr-1.5 h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  ))}
                </div>

                <div className="hidden items-center gap-1 md:flex lg:hidden">
                  {primaryTabletHeaderActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.id === "upgrade" ? "outline" : "ghost"}
                      className={
                        action.id === "upgrade"
                          ? "border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                      }
                      onClick={() => handleHeaderActionClick(action)}
                      aria-label={action.label}
                    >
                      <action.icon className="mr-1.5 h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  ))}
                  {overflowTabletHeaderActions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100" aria-label="More header actions">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                        {overflowTabletHeaderActions.map((action) => (
                          <DropdownMenuItem
                            key={action.id}
                            onClick={() => handleHeaderActionClick(action)}
                            className="focus:bg-zinc-800 focus:text-zinc-100"
                          >
                            <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="hidden h-8 rounded-full border-zinc-700 bg-zinc-950 px-2.5 text-xs font-medium text-zinc-100 hover:bg-zinc-900 md:inline-flex"
                  onClick={handleOpenLearnMoreDialog}
                  aria-label="Open onboarding guide"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  <span>{creditsBalanceLabel}</span>
                </Button>

                <TooltipProvider delayDuration={150}>
                  <div className="flex items-center gap-1 md:hidden">
                    {primaryMobileHeaderActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <Tooltip key={action.id}>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant={action.id === "upgrade" ? "outline" : "ghost"}
                              className={
                                action.id === "upgrade"
                                  ? "h-8 w-8 border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                                  : "h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                              }
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
                                variant="ghost"
                                className="h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                                aria-label="More actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent className="border-zinc-800 bg-zinc-900 text-zinc-100">More actions</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                          <DropdownMenuItem
                            onClick={handleOpenLearnMoreDialog}
                            className="focus:bg-zinc-800 focus:text-zinc-100"
                          >
                            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                            Credits: {creditsBalanceLabel}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          {overflowMobileHeaderActions.map((action) => (
                            <DropdownMenuItem
                              key={action.id}
                              onClick={() => handleHeaderActionClick(action)}
                              className="focus:bg-zinc-800 focus:text-zinc-100"
                            >
                              <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TooltipProvider>

                {isAuthenticated ? (
                  renderProfileMenu("h-10 w-10 rounded-full border-zinc-700 bg-zinc-950 p-0 text-zinc-100 md:h-9 md:w-9")
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900"
                    onClick={() => router.push("/login")}
                  >
                    Sign in
                  </Button>
                )}
              </div>
            </header>

            {startChatError && (
              <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {startChatError}
              </div>
            )}

            <Card className="mb-5 border-zinc-800 bg-zinc-950 p-0">
              <div className="p-3 sm:p-4">
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                  <Textarea
                    ref={mainControlsRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    placeholder="Ask v0 to build..."
                    className="min-h-[120px] resize-none border-0 bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 sm:px-4"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2 sm:px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 max-w-[200px] rounded-full border border-zinc-700 bg-zinc-950 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                        >
                          <span className="truncate">{selectedModel}</span>
                          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                        <DropdownMenuItem onClick={() => setSelectedModel("v0 Mini")} className="focus:bg-zinc-800 focus:text-zinc-100">
                          v0 Mini
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedModel("v0 Max")} className="focus:bg-zinc-800 focus:text-zinc-100">
                          v0 Max
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      type="button"
                      className="h-8 rounded-full bg-zinc-100 px-3 text-xs font-medium text-zinc-900 hover:bg-white"
                      disabled={!prompt.trim()}
                      onClick={() => startChatWithPrompt(prompt)}
                      aria-label="Send prompt"
                    >
                      Send
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border-t border-zinc-800 px-3 py-2 sm:px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-full justify-between gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs font-normal text-zinc-300 hover:bg-zinc-800 sm:w-auto sm:min-w-[220px]"
                        >
                          <span className="truncate">{selectedProjectLabel}</span>
                          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                        <DropdownMenuItem onClick={() => setSelectedProjectLabel("Select a Project")} className="focus:bg-zinc-800 focus:text-zinc-100">
                          Select a Project
                        </DropdownMenuItem>
                        {recentProjectItems.slice(0, 5).map((project) => (
                          <DropdownMenuItem
                            key={project.id}
                            onClick={() => setSelectedProjectLabel(project.title)}
                            className="focus:bg-zinc-800 focus:text-zinc-100"
                          >
                            {project.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {!isComposerUpgradeHelperDismissed && (
                <div className="border-t border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 text-xs text-zinc-400 sm:px-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="leading-relaxed">
                      Upgrade for shared projects, model controls, and workspace collaboration.
                      <Button
                        type="button"
                        variant="link"
                        className="ml-1 h-auto p-0 text-xs font-medium text-zinc-200 underline underline-offset-2 hover:text-zinc-100"
                        onClick={() => router.push("/pricing")}
                      >
                        Upgrade Plan
                      </Button>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 self-start px-2 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 sm:self-auto"
                      onClick={() => setIsComposerUpgradeHelperDismissed(true)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">Recent chats</h2>
                  <button
                    type="button"
                    className="text-xs text-zinc-500 transition hover:text-zinc-300"
                    onClick={() => router.push("/chat")}
                  >
                    View all
                  </button>
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
                      <div key={`project-loading-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                        <Skeleton className="mb-2 h-3 w-2/3 bg-zinc-800" />
                        <Skeleton className="mb-3 h-3 w-4/5 bg-zinc-800" />
                        <Skeleton className="h-20 rounded-md bg-zinc-800/70" />
                      </div>
                    ))}
                  </div>
                ) : recentItemsError ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{recentItemsError}</div>
                ) : recentProjectItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-zinc-800 bg-zinc-900/30 px-3 py-6 text-center">
                    <p className="text-xs text-zinc-400">No recent projects yet.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs text-zinc-300 hover:bg-zinc-800"
                      onClick={() => router.push("/editor")}
                    >
                      Create your first project
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {recentProjectItems.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleProjectOpen(item.id.replace("project-", ""))}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900/70"
                      >
                        <div
                          className={`mb-3 flex h-20 items-end rounded-md border border-zinc-700/70 bg-gradient-to-br p-2 ${projectThumbnailClasses[Number(item.id.length) % projectThumbnailClasses.length]}`}
                        >
                          <div className="rounded bg-zinc-950/70 px-1.5 py-0.5 text-[10px] text-zinc-200">Preview</div>
                        </div>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                          <span className="flex items-center gap-2">
                            <FolderKanban className="h-3.5 w-3.5" /> Project
                          </span>
                          <span className="rounded border border-zinc-700 px-1 py-0.5 text-[10px] text-zinc-400">#{item.id.replace("project-", "")}</span>
                        </div>
                        <p className="mb-1 truncate text-xs font-medium text-zinc-200">{item.title}</p>
                        <p className="text-[11px] text-zinc-500">{formatRecentTimestamp(item.updatedAt)}</p>
                        <p className="mt-2 text-[11px] text-cyan-300">Open in editor</p>
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
                      <div key={`chat-loading-${index}`} className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                        <Skeleton className="h-7 w-7 rounded-full bg-zinc-800" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-2 w-4/5 bg-zinc-800" />
                          <Skeleton className="h-2 w-2/5 bg-zinc-800" />
                        </div>
                        <Skeleton className="h-2 w-10 bg-zinc-800" />
                      </div>
                    ))}
                  </div>
                ) : recentItemsError ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{recentItemsError}</div>
                ) : myChatItems.length === 0 ? (
                  <div className="rounded-md border border-dashed border-zinc-800 bg-zinc-900/30 px-3 py-6 text-center">
                    <p className="text-xs text-zinc-400">No chats yet. Start one from above.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs text-zinc-300 hover:bg-zinc-800"
                      onClick={() => startChatWithPrompt()}
                    >
                      Start a chat
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myChatItems.slice(0, 6).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 transition hover:border-zinc-700 hover:bg-zinc-900">
                        <button
                          type="button"
                          onClick={() => handleChatOpen(item.sessionId)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800/90 text-zinc-300">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-zinc-300">RunAsh Agent</p>
                            <p className="truncate text-[11px] text-zinc-500">{item.title}</p>
                          </div>
                          <p className="shrink-0 text-[11px] text-zinc-500">{formatRecentTimestamp(item.updatedAt).replace("Updated ", "")}</p>
                        </button>
                        <div className="relative mr-1 h-7 w-7">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-300">
                            {getInitials(item.title)}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-950 ${
                              getRecentStatus(item.updatedAt) === "Active"
                                ? "bg-emerald-400"
                                : getRecentStatus(item.updatedAt) === "Recent"
                                  ? "bg-amber-400"
                                  : "bg-zinc-500"
                            }`}
                          />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
                              aria-label={`Open actions for ${item.title}`}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 border-zinc-800 bg-zinc-900 text-zinc-100">
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                              onClick={() => handleChatOpen(item.sessionId)}
                            >
                              Open chat
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-zinc-800 focus:text-zinc-100"
                              onClick={() => startChatWithPrompt(`Continue chat: ${item.title}`)}
                            >
                              Continue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
