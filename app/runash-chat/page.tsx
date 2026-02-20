"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signOutWithRedirect, useAuthSession } from "@/lib/auth/access-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  CreditCard,
  ExternalLink,
  FolderKanban,
  Home,
  LayoutTemplate,
  Library,
  Menu,
  MessageSquare,
  Mic,
  MoreVertical,
  PanelsTopLeft,
  LifeBuoy,
  LogOut,
  Loader2,
  Plus,
  Play,
  PlugZap,
  Pencil,
  Rocket,
  Search,
  Smile,
  Settings,
  Sparkles,
  Upload,
  User,
  Meh,
  Frown,
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

type RecentMoveDestination = {
  id: string
  label: string
  description: string
}

type SidebarFavoriteItem = {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

type ConfirmDeleteEntityType = "chat" | "folder" | "recent"

type ConfirmDeletePayload = {
  entityType: ConfirmDeleteEntityType
  entityId: string
  title: string
  description: string
}

type RenameDialogTarget = {
  entityType: "favorite" | "recent"
  entityId: string
  currentName: string
}

type OnboardingSlide = {
  title: string
  description: string
  media: {
    label: string
    value: string
  }
}

type CreditMetrics = {
  gifted: number
  monthly: number
  purchased: number
  total?: number
}

type CreditSummaryRow = {
  key: keyof Omit<CreditMetrics, "total">
  label: string
}

type SpeechTranscriptInsertMode = "append" | "replace"

type BrowserSpeechRecognitionResult = {
  transcript: string
}

type BrowserSpeechRecognitionResultList = {
  [index: number]: BrowserSpeechRecognitionResult
  isFinal?: boolean
  length: number
}

type BrowserSpeechRecognitionEvent = {
  resultIndex: number
  results: {
    [index: number]: BrowserSpeechRecognitionResultList
    length: number
  }
}

type BrowserSpeechRecognitionErrorEvent = {
  error: string
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

const creditSummaryRows: CreditSummaryRow[] = [
  { key: "gifted", label: "Gifted credits" },
  { key: "monthly", label: "Monthly credits" },
  { key: "purchased", label: "Purchased credits" },
]

const formatCreditValue = (value?: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0.00"
  }

  return value.toFixed(2)
}

const sanitizeRedeemCode = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase()

const validateRedeemCode = (value: string): string | null => {
  if (!value) {
    return "Please enter a credit code."
  }

  if (value.length < 4) {
    return "Code must be at least 4 characters."
  }

  if (value.length > 32) {
    return "Code cannot exceed 32 characters."
  }

  return null
}

const runashChatOnboardingStorageKey = "runash_chat_onboarding_seen"
const runashChatSidebarCollapsedStorageKey = "runash_chat_sidebar_collapsed"
const runashChatBannerHiddenStorageKey = "runash_chat_banner_hidden"
const runashChatUpdatesBannerHiddenStorageKey = "runash_chat_updates_hidden"
const runashChatLegacyUpdatesBannerHiddenStorageKey = "runash_updates_banner_hidden"
const runashChatUpdatesBannerSeenStorageKey = "runash_chat_updates_seen"
const runashChatFavoritesCollapsedStorageKey = "runash_chat_favorites_collapsed"
const runashChatRecentsCollapsedStorageKey = "runash_chat_recents_collapsed"
const runashChatDesktopSidebarContentId = "runash-chat-desktop-sidebar-content"
const runashChatMobileSidebarId = "runash-chat-mobile-sidebar"
const runashChatThemeStorageKey = "runash_chat_preference_theme"
const runashChatLanguageStorageKey = "runash_chat_preference_language"
const runashChatPositionStorageKey = "runash_chat_preference_chat_position"
const runashChatSettingsStorageKey = "runash_chat_settings"

const themeOptions = ["system", "dark", "light"] as const
const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "hi", label: "हिन्दी" },
] as const
const chatPositionOptions = ["left", "right"] as const
const accentColorOptions = ["violet", "blue", "emerald"] as const
const spokenLanguageOptions = ["en-US", "en-IN", "es-ES"] as const
const voiceOptions = ["alloy", "verse", "willow"] as const

type RunashThemePreference = (typeof themeOptions)[number]
type RunashLanguagePreference = (typeof languageOptions)[number]["value"]
type RunashChatPositionPreference = (typeof chatPositionOptions)[number]
type RunashAccentColorPreference = (typeof accentColorOptions)[number]
type RunashSpokenLanguagePreference = (typeof spokenLanguageOptions)[number]
type RunashVoicePreference = (typeof voiceOptions)[number]

type RunashGeneralSettings = {
  appearance: RunashThemePreference
  accentColor: RunashAccentColorPreference
  language: RunashLanguagePreference
  spokenLanguage: RunashSpokenLanguagePreference
  voice: RunashVoicePreference
  separateVoiceEnabled: boolean
  showAdditionalModels: boolean
}

const defaultRunashGeneralSettings: RunashGeneralSettings = {
  appearance: "system",
  accentColor: "violet",
  language: "en",
  spokenLanguage: "en-US",
  voice: "alloy",
  separateVoiceEnabled: false,
  showAdditionalModels: false,
}

const isValidThemePreference = (value: string | null): value is RunashThemePreference =>
  Boolean(value && themeOptions.includes(value as RunashThemePreference))

const isValidLanguagePreference = (value: string | null): value is RunashLanguagePreference =>
  Boolean(value && languageOptions.some((languageOption) => languageOption.value === value))

const isValidChatPositionPreference = (value: string | null): value is RunashChatPositionPreference =>
  Boolean(value && chatPositionOptions.includes(value as RunashChatPositionPreference))

const isValidAccentColorPreference = (value: unknown): value is RunashAccentColorPreference =>
  typeof value === "string" && accentColorOptions.includes(value as RunashAccentColorPreference)

const isValidSpokenLanguagePreference = (value: unknown): value is RunashSpokenLanguagePreference =>
  typeof value === "string" && spokenLanguageOptions.includes(value as RunashSpokenLanguagePreference)

const isValidVoicePreference = (value: unknown): value is RunashVoicePreference =>
  typeof value === "string" && voiceOptions.includes(value as RunashVoicePreference)

const parseRunashGeneralSettings = (raw: string | null): { settings: RunashGeneralSettings; isValid: boolean } => {
  if (!raw) {
    return { settings: defaultRunashGeneralSettings, isValid: true }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RunashGeneralSettings>
    const normalizedSettings: RunashGeneralSettings = {
      appearance: isValidThemePreference(parsed.appearance ?? null) ? parsed.appearance : defaultRunashGeneralSettings.appearance,
      accentColor: isValidAccentColorPreference(parsed.accentColor) ? parsed.accentColor : defaultRunashGeneralSettings.accentColor,
      language: isValidLanguagePreference(parsed.language ?? null) ? parsed.language : defaultRunashGeneralSettings.language,
      spokenLanguage: isValidSpokenLanguagePreference(parsed.spokenLanguage)
        ? parsed.spokenLanguage
        : defaultRunashGeneralSettings.spokenLanguage,
      voice: isValidVoicePreference(parsed.voice) ? parsed.voice : defaultRunashGeneralSettings.voice,
      separateVoiceEnabled:
        typeof parsed.separateVoiceEnabled === "boolean"
          ? parsed.separateVoiceEnabled
          : defaultRunashGeneralSettings.separateVoiceEnabled,
      showAdditionalModels:
        typeof parsed.showAdditionalModels === "boolean"
          ? parsed.showAdditionalModels
          : defaultRunashGeneralSettings.showAdditionalModels,
    }

    const isValid =
      normalizedSettings.appearance === parsed.appearance &&
      normalizedSettings.accentColor === parsed.accentColor &&
      normalizedSettings.language === parsed.language &&
      normalizedSettings.spokenLanguage === parsed.spokenLanguage &&
      normalizedSettings.voice === parsed.voice &&
      normalizedSettings.separateVoiceEnabled === parsed.separateVoiceEnabled &&
      normalizedSettings.showAdditionalModels === parsed.showAdditionalModels

    return { settings: normalizedSettings, isValid }
  } catch {
    return { settings: defaultRunashGeneralSettings, isValid: false }
  }
}

const onboardingSlides: OnboardingSlide[] = [
  {
    title: "Welcome to RunAsh Chat",
    description: "Plan campaigns, build bundles, and launch storefront workflows from one assistant workspace.",
    media: { label: "Sparkles", value: "✨" },
  },
  {
    title: "Use guided prompts",
    description: "Start with quick actions for checkout, bundles, and post-purchase support to move faster.",
    media: { label: "Compass", value: "🧭" },
  },
  {
    title: "Stay in control",
    description: "Track recents, jump back into sessions, and use the sidebar to keep launches organized.",
    media: { label: "Rocket", value: "🚀" },
  },
]

type HeaderAction = {
  id: "upgrade" | "feedback" | "refer"
  label: string
  tooltip: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: (triggerElement?: HTMLElement | null) => void
}

type PromptActionType = "route" | "modal" | "service" | "handler"
type PromptActionId = "enhance" | "create" | "upload" | "search" | "go-live" | "talk" | "generate-video" | "mcp" | "editor"
type ComposerMenuActionId =
  | "import-github"
  | "import-figma"
  | "upload-from-computer"
  | "generate-images"
  | "design-system-library"
  | "design-system-create"
  | "folder-new"
  | "folder-open"
  | "instructions"
  | "mcps-manage"
  | "mcps-explore"

const allowedUploadMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/json",
])

const allowedUploadExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".txt", ".json"]

type PromptActionConfig = {
  id: PromptActionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  type: PromptActionType
  requiresPlan: UpgradePlanId | null
  routeOrHandler: string
  description: string
  commandGroup: "Prompt" | "Create" | "Tools"
  unavailableReason?: string
}

const promptActionConfigs: PromptActionConfig[] = [
  {
    id: "enhance",
    label: "Enhance",
    icon: Sparkles,
    type: "handler",
    requiresPlan: null,
    routeOrHandler: "enhancePrompt",
    description: "Improve your prompt before sending.",
    commandGroup: "Prompt",
  },
  {
    id: "create",
    label: "Create",
    icon: Plus,
    type: "handler",
    requiresPlan: null,
    routeOrHandler: "startChatWithPrompt",
    description: "Start a new run with your current prompt.",
    commandGroup: "Prompt",
  },
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    type: "route",
    requiresPlan: null,
    routeOrHandler: "/upload",
    description: "Upload product or campaign assets.",
    commandGroup: "Create",
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    type: "service",
    requiresPlan: null,
    routeOrHandler: "/api/web-search",
    description: "Run a product web search from the prompt.",
    commandGroup: "Prompt",
  },
  {
    id: "go-live",
    label: "Go Live",
    icon: Rocket,
    type: "route",
    requiresPlan: "team",
    routeOrHandler: "/live",
    description: "Launch a live commerce session.",
    commandGroup: "Create",
  },
  {
    id: "talk",
    label: "Talk",
    icon: Mic,
    type: "modal",
    requiresPlan: null,
    routeOrHandler: "settings",
    description: "Open voice preferences in settings.",
    commandGroup: "Tools",
  },
  {
    id: "generate-video",
    label: "Generate Video",
    icon: Play,
    type: "route",
    requiresPlan: "premium",
    routeOrHandler: "/editor?mode=video",
    description: "Jump to video generation workspace.",
    commandGroup: "Create",
  },
  {
    id: "mcp",
    label: "MCP",
    icon: PlugZap,
    type: "route",
    requiresPlan: "team",
    routeOrHandler: "/integrations",
    description: "Manage MCP integrations.",
    commandGroup: "Tools",
    unavailableReason: "MCP setup is currently managed in the integrations dashboard.",
  },
  {
    id: "editor",
    label: "Editor",
    icon: Pencil,
    type: "route",
    requiresPlan: null,
    routeOrHandler: "/editor",
    description: "Open the RunAsh editor.",
    commandGroup: "Tools",
  },
]

type SidebarActionMenuSection = "favorite" | "recent"

type SidebarActionMenuState = {
  section: SidebarActionMenuSection
  rowId: string
}

type ActiveModal =
  | "rename"
  | "move"
  | "deleteConfirm"
  | "shareRecent"
  | "feedback"
  | "upgrade"
  | "refer"
  | "credits"
  | "settings"
  | "redeem"
  | null

type OverlayState = {
  sidebarActionMenu: SidebarActionMenuState | null
  activeModal: ActiveModal
}

const settingsSections = [
  "General",
  "Notifications",
  "Personalization",
  "Apps",
  "Schedules",
  "Data controls",
  "Security",
  "Account",
] as const

type SettingsSection = (typeof settingsSections)[number]

type UpgradePlanId = "free" | "premium" | "team" | "business" | "enterprise"

type PlanConfigurationEntry = {
  id: UpgradePlanId
  label: string
  price: string
  billingPeriod: string
  description: string
  ctaLabel: string
  ctaHref: string
  features: string[]
}

type ReferralUiData = {
  headline: string
  rewardCap: number
  progressValue: number
  referralLink: string
  steps: string[]
}

const defaultReferralUiData: ReferralUiData = {
  headline: "Invite & earn rewards",
  rewardCap: 10,
  progressValue: 3,
  referralLink: "https://runash.in/refer?code=RUNASH-CHAT",
  steps: [
    "Share your link with creators, teammates, or storefront operators.",
    "They sign up and launch their first RunAsh Chat workflow.",
    "You both receive reward credits automatically each month.",
  ],
}

const referralUiDataOverrides: Partial<ReferralUiData> = {
  ...defaultReferralUiData,
}

const buildReferralUiData = (overrides?: Partial<ReferralUiData>): ReferralUiData => {
  const rewardCap = Number.isFinite(overrides?.rewardCap)
    ? Math.max(0, Math.trunc(overrides?.rewardCap ?? defaultReferralUiData.rewardCap))
    : defaultReferralUiData.rewardCap
  const progressValue = Number.isFinite(overrides?.progressValue)
    ? Math.min(rewardCap, Math.max(0, Math.trunc(overrides?.progressValue ?? defaultReferralUiData.progressValue)))
    : Math.min(defaultReferralUiData.progressValue, rewardCap)
  const steps = overrides?.steps?.filter((step): step is string => Boolean(step?.trim().length)) ?? defaultReferralUiData.steps

  return {
    headline: overrides?.headline?.trim() || defaultReferralUiData.headline,
    rewardCap,
    progressValue,
    referralLink: overrides?.referralLink?.trim() || defaultReferralUiData.referralLink,
    steps: steps.length > 0 ? steps : defaultReferralUiData.steps,
  }
}

const referralUiData = buildReferralUiData(referralUiDataOverrides)

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

const upgradePlanConfigurations: Record<UpgradePlanId, PlanConfigurationEntry> = {
  free: {
    id: "free",
    label: "Free",
    price: "$0",
    billingPeriod: "/ month",
    description: "Try core RunAsh Chat workflows and launch your first guided tasks.",
    ctaLabel: "Stay on Free",
    ctaHref: "/pricing?plan=free",
    features: ["Basic prompt workflows", "Limited monthly credits", "Community support"],
  },
  premium: {
    id: "premium",
    label: "Premium",
    price: "$29",
    billingPeriod: "/ month",
    description: "Unlock deeper automations for growing creators and solo stores.",
    ctaLabel: "Choose Premium",
    ctaHref: "/pricing?plan=premium",
    features: ["Higher usage limits", "Priority model access", "Email support"],
  },
  team: {
    id: "team",
    label: "Team",
    price: "$99",
    billingPeriod: "/ month",
    description: "Coordinate campaigns with shared workspaces and role-based access.",
    ctaLabel: "Choose Team",
    ctaHref: "/pricing?plan=team",
    features: ["Shared projects", "Team seats and permissions", "Workflow collaboration"],
  },
  business: {
    id: "business",
    label: "Business",
    price: "$299",
    billingPeriod: "/ month",
    description: "Scale live commerce operations with advanced controls and analytics.",
    ctaLabel: "Choose Business",
    ctaHref: "/pricing?plan=business",
    features: ["Advanced automations", "Business dashboards", "Priority onboarding"],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    price: "Custom pricing",
    billingPeriod: "",
    description: "Get custom governance, integrations, and success planning.",
    ctaLabel: "Contact Sales",
    ctaHref: "/pricing?plan=enterprise",
    features: ["Custom integrations", "Dedicated success manager", "Enterprise security controls"],
  },
}

const defaultUpgradePlanId: UpgradePlanId = "team"

const upgradePlans: PlanConfigurationEntry[] = [
  upgradePlanConfigurations.free,
  upgradePlanConfigurations.premium,
  upgradePlanConfigurations.team,
  upgradePlanConfigurations.business,
  upgradePlanConfigurations.enterprise,
]

const getUpgradePlanConfiguration = (planId: UpgradePlanId): PlanConfigurationEntry =>
  upgradePlanConfigurations[planId] ?? upgradePlanConfigurations[defaultUpgradePlanId]

const formatPlanPriceLabel = (plan: PlanConfigurationEntry) =>
  plan.billingPeriod ? `${plan.price} ${plan.billingPeriod}` : plan.price

const isUpgradePlanId = (value: string | null): value is UpgradePlanId =>
  Boolean(value && Object.prototype.hasOwnProperty.call(upgradePlanConfigurations, value))


export default function RunashChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
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
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false)
  const [isRecordingPrompt, setIsRecordingPrompt] = useState(false)
  const [speechTranscriptPreview, setSpeechTranscriptPreview] = useState("")
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | null>(null)
  const [speechInsertMode, setSpeechInsertMode] = useState<SpeechTranscriptInsertMode>("append")
  const [startChatError, setStartChatError] = useState<string | null>(null)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [mobileSearchValue, setMobileSearchValue] = useState("")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true)
  const [favoriteItems, setFavoriteItems] = useState<SidebarFavoriteItem[]>(sidebarFavoriteItems)
  const [overlayState, setOverlayState] = useState<OverlayState>({
    sidebarActionMenu: null,
    activeModal: null,
  })
  const [isRecentsExpanded, setIsRecentsExpanded] = useState(true)
  const [shareRecentItem, setShareRecentItem] = useState<RecentEntity | null>(null)
  const [moveRecentItem, setMoveRecentItem] = useState<RecentEntity | null>(null)
  const [selectedMoveDestinationId, setSelectedMoveDestinationId] = useState<string>("")
  const [renameDialogTarget, setRenameDialogTarget] = useState<RenameDialogTarget | null>(null)
  const [renameInputValue, setRenameInputValue] = useState("")
  const [renameInputError, setRenameInputError] = useState<string | null>(null)
  const [isCopyingRecentLink, setIsCopyingRecentLink] = useState(false)
  const [confirmDeletePayload, setConfirmDeletePayload] = useState<ConfirmDeletePayload | null>(null)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isCopyingLink, setIsCopyingLink] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlanId>("team")
  const [isPlanActionLoading, setIsPlanActionLoading] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const mobileSidebarTriggerRef = useRef<HTMLButtonElement | null>(null)
  const sidebarScrollAreaRef = useRef<HTMLDivElement | null>(null)
  const desktopSidebarToggleRef = useRef<HTMLButtonElement | null>(null)
  const learnMoreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mainControlsRef = useRef<HTMLTextAreaElement | null>(null)
  const composerUploadInputRef = useRef<HTMLInputElement | null>(null)
  const lastOverlayTriggerRef = useRef<HTMLElement | null>(null)
  const deleteActionTriggerRef = useRef<HTMLElement | null>(null)
  const rowActionTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rowActionContentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechCommitReadyRef = useRef(false)
  const speechTranscriptFinalRef = useRef("")
  const speechTimeoutRef = useRef<number | null>(null)
  const [selectedModel, setSelectedModel] = useState<"v0 Mini" | "v0 Max">("v0 Mini")
  const [selectedProjectLabel, setSelectedProjectLabel] = useState("Select a Project")
  const [activePromptActionId, setActivePromptActionId] = useState<PromptActionId | null>(null)
  const [isPromptActionLoading, setIsPromptActionLoading] = useState(false)
  const [isComposerMenuOpen, setIsComposerMenuOpen] = useState(false)
  const [composerMenuActionLoadingId, setComposerMenuActionLoadingId] = useState<ComposerMenuActionId | null>(null)
  const [composerMenuError, setComposerMenuError] = useState<string | null>(null)
  const [uploadedAssetName, setUploadedAssetName] = useState<string | null>(null)
  const [generateImagesEnabled, setGenerateImagesEnabled] = useState(false)
  const [themePreference, setThemePreference] = useState<RunashThemePreference>("system")
  const [languagePreference, setLanguagePreference] = useState<RunashLanguagePreference>("en")
  const [chatPositionPreference, setChatPositionPreference] = useState<RunashChatPositionPreference>("left")
  const [isComposerUpgradeHelperDismissed, setIsComposerUpgradeHelperDismissed] = useState(false)
  const [redeemCodeInput, setRedeemCodeInput] = useState("")
  const [redeemCodeError, setRedeemCodeError] = useState<string | null>(null)
  const [isRedeemingCode, setIsRedeemingCode] = useState(false)
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection>("General")
  const [generalSettings, setGeneralSettings] = useState<RunashGeneralSettings>(defaultRunashGeneralSettings)
  const settingsSectionButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const upgradeCtaClassName =
    "border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-500"
  const actionMenuContentClassName = "z-40 w-48 border-zinc-800 bg-zinc-950 p-1.5 text-zinc-100"
  const actionMenuItemClassName = "cursor-pointer rounded-sm px-2.5 py-1.5 text-zinc-200 focus:bg-zinc-900 focus:text-zinc-100"
  const actionMenuDangerItemClassName = "cursor-pointer rounded-sm px-2.5 py-1.5 text-red-300 focus:bg-red-950/60 focus:text-red-200"
  const creditsPanelId = "runash-chat-credits-panel"
  const redeemCodeInputId = "runash-chat-redeem-code-input"
  const creditsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const creditsPanelRef = useRef<HTMLDivElement | null>(null)
  const redeemDialogTriggerRef = useRef<HTMLElement | null>(null)
  const profileMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const darkDialogContentClassName = "border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md"
  const compactDarkDialogContentClassName = "w-[min(92vw,26rem)] border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-[26rem]"

  const feedbackRatingOptions: { value: number; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 5, label: "Loved it", Icon: Smile },
    { value: 3, label: "It was okay", Icon: Meh },
    { value: 1, label: "Needs work", Icon: Frown },
  ]

  const isLastOnboardingStep = onboardingStep === onboardingSlides.length - 1
  const currentOnboardingSlide = onboardingSlides[onboardingStep]
  const isFeedbackOpen = overlayState.activeModal === "feedback"
  const isReferOpen = overlayState.activeModal === "refer"
  const isUpgradeModalOpen = overlayState.activeModal === "upgrade"
  const isCreditsOpen = overlayState.activeModal === "credits"
  const isSettingsOpen = overlayState.activeModal === "settings"
  const isRedeemDialogOpen = overlayState.activeModal === "redeem"
  const referralProgressPercent =
    referralUiData.rewardCap > 0 ? Math.min(100, Math.round((referralUiData.progressValue / referralUiData.rewardCap) * 100)) : 0

  const authenticatedUser = session?.user
  const isAuthenticated = authStatus === "authenticated" && Boolean(authenticatedUser)
  const allowedUploadTypesLabel = "PNG, JPG, WEBP, GIF, PDF, TXT, or JSON"

  const isFileTypeAllowed = (file: File) => {
    const normalizedFileName = file.name.toLowerCase()
    const hasAllowedExtension = allowedUploadExtensions.some((extension) => normalizedFileName.endsWith(extension))
    return allowedUploadMimeTypes.has(file.type) || hasAllowedExtension
  }

  const getSpeechRecognitionConstructor = (): BrowserSpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") {
      return null
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
    }

    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
  }

  const clearSpeechTimeout = () => {
    if (speechTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(speechTimeoutRef.current)
    speechTimeoutRef.current = null
  }

  const resetSpeechTimeout = () => {
    clearSpeechTimeout()
    speechTimeoutRef.current = window.setTimeout(() => {
      setSpeechErrorMessage("Voice input timed out. Try again and speak right after starting.")
      setIsRecordingPrompt(false)
      speechCommitReadyRef.current = false
      speechRecognitionRef.current?.abort()
      speechRecognitionRef.current = null
    }, 12000)
  }

  const applyTranscriptToPrompt = (transcript: string, insertMode: SpeechTranscriptInsertMode) => {
    const normalizedTranscript = transcript.trim()
    if (!normalizedTranscript) {
      return
    }

    setPrompt((previousPrompt) => {
      if (insertMode === "replace") {
        return normalizedTranscript
      }

      if (!previousPrompt.trim()) {
        return normalizedTranscript
      }

      const separator = previousPrompt.endsWith("\n") || previousPrompt.endsWith(" ") ? "" : " "
      return `${previousPrompt}${separator}${normalizedTranscript}`
    })
    window.requestAnimationFrame(() => {
      mainControlsRef.current?.focus()
    })
  }

  const stopPromptRecording = () => {
    setSpeechErrorMessage(null)
    speechCommitReadyRef.current = true
    speechRecognitionRef.current?.stop()
  }

  const cancelPromptRecording = () => {
    speechCommitReadyRef.current = false
    setSpeechTranscriptPreview("")
    setSpeechErrorMessage(null)
    clearSpeechTimeout()
    speechRecognitionRef.current?.abort()
    speechRecognitionRef.current = null
    setIsRecordingPrompt(false)
  }

  const startPromptRecording = () => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor()

    if (!SpeechRecognitionConstructor) {
      setSpeechErrorMessage("Voice input is not supported in this browser. Try Chrome, Edge, or Safari.")
      return
    }

    const recognition = new SpeechRecognitionConstructor()
    speechRecognitionRef.current = recognition
    speechCommitReadyRef.current = true
    speechTranscriptFinalRef.current = ""
    setSpeechTranscriptPreview("")
    setSpeechErrorMessage(null)
    setIsRecordingPrompt(true)

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = generalSettings.spokenLanguage

    recognition.onresult = (event) => {
      let interimTranscript = ""

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const segment = result?.[0]?.transcript ?? ""

        if (result?.isFinal) {
          const leadingSpacer = speechTranscriptFinalRef.current ? " " : ""
          speechTranscriptFinalRef.current = `${speechTranscriptFinalRef.current}${leadingSpacer}${segment.trim()}`.trim()
        } else {
          interimTranscript = `${interimTranscript}${segment}`
        }
      }

      setSpeechTranscriptPreview(`${speechTranscriptFinalRef.current} ${interimTranscript}`.trim())
      resetSpeechTimeout()
    }

    recognition.onerror = (event) => {
      const errorMessageMap: Record<string, string> = {
        "not-allowed": "Microphone permission was denied. Allow access and try again.",
        "service-not-allowed": "Microphone access is blocked by browser settings.",
        "audio-capture": "No microphone was detected. Check your input device and try again.",
        "no-speech": "No speech was detected. Try speaking closer to your microphone.",
        aborted: "",
      }

      const mappedMessage = errorMessageMap[event.error] ?? "Voice input failed. Please try again."
      setSpeechErrorMessage(mappedMessage || null)
      setIsRecordingPrompt(false)
      clearSpeechTimeout()
    }

    recognition.onend = () => {
      clearSpeechTimeout()
      setIsRecordingPrompt(false)

      if (speechCommitReadyRef.current && speechTranscriptFinalRef.current.trim()) {
        applyTranscriptToPrompt(speechTranscriptFinalRef.current, speechInsertMode)
      }

      setSpeechTranscriptPreview("")
      speechTranscriptFinalRef.current = ""
      speechCommitReadyRef.current = false
      speechRecognitionRef.current = null
    }

    resetSpeechTimeout()

    try {
      recognition.start()
    } catch {
      clearSpeechTimeout()
      setIsRecordingPrompt(false)
      setSpeechErrorMessage("Unable to start voice input right now. Please try again.")
      speechRecognitionRef.current = null
    }
  }

  const togglePromptRecording = () => {
    if (isRecordingPrompt) {
      stopPromptRecording()
      return
    }

    startPromptRecording()
  }

  const trackPromptAction = (action: PromptActionConfig, status: "opened" | "success" | "error" | "disabled") => {
    if (typeof window === "undefined") return

    window.dispatchEvent(
      new CustomEvent("runash-chat:prompt-action", {
        detail: { actionId: action.id, actionType: action.type, status },
      }),
    )
  }

  const isPromptActionDisabled = (action: PromptActionConfig) =>
    Boolean(action.unavailableReason) || (action.requiresPlan !== null && !isAuthenticated)

  const getPromptActionTooltip = (action: PromptActionConfig) => {
    if (action.unavailableReason) {
      return action.unavailableReason
    }

    if (action.requiresPlan && !isAuthenticated) {
      return `${action.label} requires a ${action.requiresPlan} plan. Sign in to continue.`
    }

    return action.description
  }

  const rememberOverlayTrigger = (triggerElement?: HTMLElement | null) => {
    if (triggerElement instanceof HTMLElement) {
      lastOverlayTriggerRef.current = triggerElement
      return
    }

    if (document.activeElement instanceof HTMLElement) {
      lastOverlayTriggerRef.current = document.activeElement
    }
  }

  const mapRecentEntityToFavorite = (item: RecentEntity): SidebarFavoriteItem => {
    const isProject = item.entityType === "project"
    const fallbackSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "recent"

    return {
      id: `favorite-${item.id}`,
      label: item.title,
      description: isProject ? "From recents · project" : "From recents · chat",
      icon: isProject ? FolderKanban : MessageSquare,
      href: isProject ? `/editor?projectId=${item.id.replace("project-", "")}` : `/runash-chat?session=${item.sessionId ?? fallbackSlug}`,
    }
  }

  const getSidebarActionMenuKey = (section: SidebarActionMenuSection, rowId: string) => `${section}-${rowId}`

  const isSidebarActionMenuOpen = (section: SidebarActionMenuSection, rowId: string) =>
    overlayState.sidebarActionMenu?.section === section && overlayState.sidebarActionMenu.rowId === rowId

  const closeSidebarActionMenu = () => {
    setOverlayState((previousState) => ({ ...previousState, sidebarActionMenu: null }))
  }

  const openSidebarActionMenu = (section: SidebarActionMenuSection, rowId: string) => {
    setOverlayState({
      sidebarActionMenu: { section, rowId },
      activeModal: null,
    })
  }

  const closeRecentMenu = () => {
    closeSidebarActionMenu()
  }

  const handleRecentAddToFavorites = (item: RecentEntity) => {
    const nextFavorite = mapRecentEntityToFavorite(item)

    setFavoriteItems((previousItems) => {
      if (previousItems.some((favoriteItem) => favoriteItem.id === nextFavorite.id)) {
        return previousItems
      }

      return [nextFavorite, ...previousItems]
    })

    closeRecentMenu()
    toast({
      title: "Added to Favorites",
      description: `${item.title} is now pinned in your favorites list.`,
    })
  }

  const buildRecentShareLink = (item: RecentEntity): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

    if (item.entityType === "project") {
      return `${baseUrl}/editor?projectId=${item.id.replace("project-", "")}`
    }

    return `${baseUrl}/runash-chat?session=${item.sessionId ?? item.id}`
  }

  const handleRecentShare = (item: RecentEntity) => {
    setShareRecentItem(item)
    closeRecentMenu()
    setOverlayState((previousState) => ({ ...previousState, activeModal: "shareRecent" }))
  }

  const handleRecentMove = (item: RecentEntity) => {
    setMoveRecentItem(item)
    setSelectedMoveDestinationId("")
    closeRecentMenu()
    setOverlayState((previousState) => ({ ...previousState, activeModal: "move" }))
  }

  const handleRecentRename = (item: RecentEntity) => {
    setRenameDialogTarget({
      entityType: "recent",
      entityId: item.id,
      currentName: item.title,
    })
    setRenameInputValue(item.title)
    setRenameInputError(null)
    closeRecentMenu()
    setOverlayState((previousState) => ({ ...previousState, activeModal: "rename" }))
  }

  const handleRecentDelete = (item: RecentEntity) => {
    closeRecentMenu()
    setConfirmDeletePayload({
      entityType: item.entityType === "session" ? "chat" : "recent",
      entityId: item.id,
      title: item.title,
      description: `Delete ${item.title} from your recents list? This action cannot be undone.`,
    })
    setOverlayState((previousState) => ({ ...previousState, activeModal: "deleteConfirm" }))
  }

  const restoreDeleteActionTriggerFocus = () => {
    const triggerElement = deleteActionTriggerRef.current
    if (triggerElement && document.contains(triggerElement)) {
      window.setTimeout(() => {
        triggerElement.focus()
      }, 0)
    }
  }

  const closeDeleteConfirmModal = (restoreFocus = false) => {
    setConfirmDeletePayload(null)
    setOverlayState((previousState) => ({ ...previousState, activeModal: null }))

    if (restoreFocus) {
      restoreDeleteActionTriggerFocus()
    }
  }

  const handleDeleteConfirm = () => {
    if (!confirmDeletePayload) return

    if (confirmDeletePayload.entityType === "folder") {
      setFavoriteItems((previousItems) => previousItems.filter((favoriteItem) => favoriteItem.id !== confirmDeletePayload.entityId))
      toast({
        title: "Folder deleted",
        description: `${confirmDeletePayload.title} was removed from your workspace list.`,
        variant: "destructive",
      })
    } else {
      setRecentEntities((previousItems) => previousItems.filter((recentItem) => recentItem.id !== confirmDeletePayload.entityId))
      toast({
        title: "Item deleted",
        description:
          confirmDeletePayload.entityType === "chat"
            ? `${confirmDeletePayload.title} chat was removed from Recents.`
            : `${confirmDeletePayload.title} was removed from Recents.`,
        variant: "destructive",
      })
    }

    closeDeleteConfirmModal(true)
  }

  const handleCopyRecentShareLink = async () => {
    if (!shareRecentItem) return

    try {
      setIsCopyingRecentLink(true)
      await navigator.clipboard.writeText(buildRecentShareLink(shareRecentItem))
      toast({
        title: "Share link copied",
        description: `Copied link for ${shareRecentItem.title}.`,
      })
      setShareRecentItem(null)
      setOverlayState((previousState) => ({ ...previousState, activeModal: null }))
    } catch {
      toast({
        title: "Could not copy link",
        description: "Please copy the share link manually.",
        variant: "destructive",
      })
    } finally {
      setIsCopyingRecentLink(false)
    }
  }

  const recentMoveDestinations: RecentMoveDestination[] = [
    { id: "favorites", label: "Favorites", description: "Pin this item for faster access." },
    ...favoriteItems.map((favoriteItem) => ({
      id: favoriteItem.id,
      label: favoriteItem.label,
      description: favoriteItem.description,
    })),
  ]

  const handleRecentMoveDestinationSelect = (destination: RecentMoveDestination) => {
    if (!moveRecentItem) return

    if (destination.id === "favorites") {
      const nextFavorite = mapRecentEntityToFavorite(moveRecentItem)
      setFavoriteItems((previousItems) => {
        if (previousItems.some((favoriteItem) => favoriteItem.id === nextFavorite.id)) {
          return previousItems
        }

        return [nextFavorite, ...previousItems]
      })
    }

    setRecentEntities((previousItems) => previousItems.filter((recentItem) => recentItem.id !== moveRecentItem.id))

    toast({
      title: "Item moved",
      description: `${moveRecentItem.title} moved to ${destination.label}.`,
    })
    setMoveRecentItem(null)
    setSelectedMoveDestinationId("")
    setOverlayState((previousState) => ({ ...previousState, activeModal: null }))
  }

  const closeRenameDialog = () => {
    setRenameDialogTarget(null)
    setRenameInputValue("")
    setRenameInputError(null)
    setOverlayState((previousState) => ({ ...previousState, activeModal: null }))
  }

  const handleRenameSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!renameDialogTarget) return

    const trimmedLabel = renameInputValue.trim()
    if (!trimmedLabel) {
      setRenameInputError("Please enter a name.")
      return
    }

    if (renameDialogTarget.entityType === "favorite") {
      setFavoriteItems((previousItems) =>
        previousItems.map((favoriteItem) =>
          favoriteItem.id === renameDialogTarget.entityId ? { ...favoriteItem, label: trimmedLabel } : favoriteItem,
        ),
      )
      toast({
        title: "Favorite renamed",
        description: `Updated to \"${trimmedLabel}\".`,
      })
    } else {
      setRecentEntities((previousItems) =>
        previousItems.map((recentItem) =>
          recentItem.id === renameDialogTarget.entityId ? { ...recentItem, title: trimmedLabel } : recentItem,
        ),
      )
      toast({
        title: "Item renamed",
        description: `Updated to \"${trimmedLabel}\".`,
      })
    }

    closeRenameDialog()
  }

  const closeMoveDialog = () => {
    setMoveRecentItem(null)
    setSelectedMoveDestinationId("")
    setOverlayState((previousState) => ({ ...previousState, activeModal: null }))
  }

  const handleMoveSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const destination = recentMoveDestinations.find((recentDestination) => recentDestination.id === selectedMoveDestinationId)
    if (!destination) {
      return
    }

    handleRecentMoveDestinationSelect(destination)
  }

  const focusOverlayTrigger = () => {
    const triggerElement = lastOverlayTriggerRef.current
    if (triggerElement && document.contains(triggerElement)) {
      triggerElement.focus()
      return
    }

    restoreFocusToMainControls()
  }

  const openModal = (overlay: Exclude<ActiveModal, null>, triggerElement?: HTMLElement | null) => {
    rememberOverlayTrigger(triggerElement)
    setOverlayState({ sidebarActionMenu: null, activeModal: overlay })
  }

  const closeModal = (restoreFocus = false) => {
    setOverlayState((previousState) => ({ ...previousState, activeModal: null }))
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        focusOverlayTrigger()
      })
    }
  }

  const dismissModal = (overlay: Exclude<ActiveModal, null>, restoreFocus = true) => {
    closeModal(restoreFocus)

    if (overlay === "upgrade") {
      setIsPlanActionLoading(false)
    }

    if (overlay === "feedback") {
      resetFeedbackDialog()
    }

    if (overlay === "shareRecent") {
      setShareRecentItem(null)
      setIsCopyingRecentLink(false)
    }

    if (overlay === "rename") {
      closeRenameDialog()
    }

    if (overlay === "move") {
      closeMoveDialog()
    }

    if (overlay === "deleteConfirm") {
      closeDeleteConfirmModal(restoreFocus)
    }
  }

  function openUpgradeModal(planId?: UpgradePlanId, triggerElement?: HTMLElement | null) {
    if (planId) {
      setSelectedPlan(planId)
    }
    setIsPlanActionLoading(false)
    openModal("upgrade", triggerElement)
  }

  const headerActions: HeaderAction[] = [
    {
      id: "upgrade",
      label: "Upgrade",
      tooltip: "View upgrade plans",
      icon: Rocket,
      onClick: (triggerElement) => openUpgradeModal(undefined, triggerElement),
    },
    {
      id: "feedback",
      label: "Feedback",
      tooltip: "Share product feedback",
      icon: MessageSquare,
      onClick: (triggerElement) => openModal("feedback", triggerElement),
    },
    {
      id: "refer",
      label: "Refer",
      tooltip: "Refer a friend or team",
      icon: Sparkles,
      onClick: (triggerElement) => openModal("refer", triggerElement),
    },
  ]

  const primaryMobileHeaderActions = headerActions.slice(0, 1)
  const overflowMobileHeaderActions = headerActions.slice(1)
  const primaryTabletHeaderActions = headerActions.slice(0, 2)
  const overflowTabletHeaderActions = headerActions.slice(2)
  const [creditMetrics] = useState<CreditMetrics>({
    gifted: 1,
    monthly: 3,
    purchased: 1,
    total: 5,
  })
  const creditsBalanceLabel = formatCreditValue(
    creditMetrics.total ?? creditMetrics.gifted + creditMetrics.monthly + creditMetrics.purchased,
  )
  const selectedUpgradePlan = getUpgradePlanConfiguration(selectedPlan)

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
    onSelect?: () => void
  }

  const openSettingsDialog = () => {
    openModal("settings", profileMenuTriggerRef.current)
  }

  const accountMenuItems: UserMenuItem[] = [
    { label: "Profile", icon: User, href: "/account" },
    { label: "Settings", icon: Settings, href: "/settings", onSelect: openSettingsDialog },
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
          ref={profileMenuTriggerRef}
          type="button"
          variant="outline"
          className={triggerClassName}
          aria-label="Open account menu"
          aria-haspopup="menu"
          onClick={(event) => {
            profileMenuTriggerRef.current = event.currentTarget
          }}
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
                onSelect={() => {
                  if (item.onSelect) {
                    item.onSelect()
                    return
                  }

                  handleUserMenuNavigation(item)
                }}
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

  const handleHeaderActionClick = (action: HeaderAction, triggerElement?: HTMLElement | null) => {
    if (action.href) {
      router.push(action.href)
      return
    }
    action.onClick?.(triggerElement)
  }

  const handlePlanCtaClick = () => {
    setIsPlanActionLoading(true)
    router.push(selectedUpgradePlan.ctaHref)
  }

  const resetFeedbackDialog = () => {
    setFeedbackText("")
    setFeedbackRating(null)
    setIsSubmittingFeedback(false)
  }

  const handleFeedbackOpenChange = (open: boolean) => {
    if (!open && isSubmittingFeedback) return

    if (open) {
      openModal("feedback")
      return
    }

    dismissModal("feedback")
  }

  const handleReferDialogOpenChange = (open: boolean) => {
    if (open) {
      openModal("refer")
      return
    }

    dismissModal("refer")
  }

  const handleCopyReferralLink = async () => {
    try {
      setIsCopyingLink(true)
      await navigator.clipboard.writeText(referralUiData.referralLink)
      toast({
        title: "Referral link copied",
        description: "Share it with friends to start earning rewards.",
      })
    } catch {
      toast({
        title: "Could not copy link",
        description: "Please copy your referral link manually.",
        variant: "destructive",
      })
    } finally {
      setIsCopyingLink(false)
    }
  }

  const handleUpgradeModalOpenChange = (open: boolean) => {
    if (open) {
      openModal("upgrade")
      return
    }

    dismissModal("upgrade")
  }

  const handleSettingsDialogOpenChange = (open: boolean) => {
    if (open) {
      openModal("settings")
      return
    }

    dismissModal("settings")
  }

  const handleSettingsSectionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const lastIndex = settingsSections.length - 1
    let nextIndex: number | null = null

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1
    } else if (event.key === "Home") {
      nextIndex = 0
    } else if (event.key === "End") {
      nextIndex = lastIndex
    }

    if (nextIndex === null) {
      return
    }

    event.preventDefault()
    setActiveSettingsSection(settingsSections[nextIndex])
    settingsSectionButtonRefs.current[nextIndex]?.focus()
  }

  const closeCreditsPanel = (restoreFocus = false) => {
    dismissModal("credits", restoreFocus)
  }

  const openRedeemCodeDialog = (triggerElement?: HTMLElement | null) => {
    redeemDialogTriggerRef.current = triggerElement ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    closeCreditsPanel(false)
    setRedeemCodeInput("")
    setRedeemCodeError(null)
    setIsRedeemingCode(false)
    openModal("redeem")
  }

  const handleRedeemDialogOpenChange = (open: boolean) => {
    if (open) {
      openModal("redeem")
      return
    }

    closeModal(false)
    if (!open) {
      setIsRedeemingCode(false)
      setRedeemCodeError(null)
      setRedeemCodeInput("")
      window.requestAnimationFrame(() => {
        if (redeemDialogTriggerRef.current && document.contains(redeemDialogTriggerRef.current)) {
          redeemDialogTriggerRef.current.focus()
          return
        }

        creditsTriggerRef.current?.focus()
      })
    }
  }

  const handleRedeemCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const sanitizedCode = sanitizeRedeemCode(redeemCodeInput.trim())
    const validationMessage = validateRedeemCode(sanitizedCode)
    if (validationMessage) {
      setRedeemCodeError(validationMessage)
      toast({
        title: "Invalid code",
        description: validationMessage,
        variant: "destructive",
      })
      return
    }

    setIsRedeemingCode(true)
    setRedeemCodeError(null)

    try {
      router.push(`/settings/billing?section=redeem&code=${encodeURIComponent(sanitizedCode)}`)
      toast({
        title: "Code ready to redeem",
        description: "We opened Billing so you can complete your credit redemption.",
      })
      handleRedeemDialogOpenChange(false)
    } catch {
      const errorMessage = "We could not open billing. Please try again."
      setRedeemCodeError(errorMessage)
      toast({
        title: "Redeem failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsRedeemingCode(false)
    }
  }

  const handleFeedbackSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedFeedback = feedbackText.trim()
    if (!trimmedFeedback) {
      toast({
        title: "Feedback required",
        description: "Please enter feedback before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsSubmittingFeedback(true)

    try {
      const canUseFeedbackEndpoint = Boolean(sessionId)

      if (canUseFeedbackEndpoint) {
        const response = await fetch("/api/agents/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            signal: "quality",
            score: feedbackRating ?? 3,
            reason: trimmedFeedback,
          }),
        })

        if (!response.ok) {
          throw new Error("Feedback endpoint unavailable")
        }

        toast({
          title: "Thanks for your feedback",
          description: "Your feedback helps us improve RunAsh Chat.",
        })

        handleFeedbackOpenChange(false)
        return
      } else {
        router.push(`/support?feedback=${encodeURIComponent(trimmedFeedback)}`)
        toast({
          title: "Continue on Support",
          description: "We redirected you to Support so you can finish sharing your feedback.",
        })
        handleFeedbackOpenChange(false)
        return
      }
    } catch {
      toast({
        title: "Feedback service unavailable",
        description: "We redirected you to Support so your message is not lost.",
      })

      router.push(`/support?feedback=${encodeURIComponent(trimmedFeedback)}`)
      handleFeedbackOpenChange(false)
    }
  }

  useEffect(() => {
    setIsSpeechRecognitionSupported(Boolean(getSpeechRecognitionConstructor()))
  }, [])

  useEffect(() => {
    return () => {
      clearSpeechTimeout()
      speechRecognitionRef.current?.abort()
      speechRecognitionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isRecordingPrompt) {
      return
    }

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = generalSettings.spokenLanguage
    }
  }, [generalSettings.spokenLanguage, isRecordingPrompt])

  useEffect(() => {
    const planFromQuery = searchParams.get("plan")
    if (isUpgradePlanId(planFromQuery)) {
      setSelectedPlan(planFromQuery)
    }
  }, [searchParams])

  useEffect(() => {
    const savedValue = localStorage.getItem(runashChatSidebarCollapsedStorageKey)
    setIsSidebarCollapsed(savedValue === "true")
    const savedFavoritesCollapsedValue = localStorage.getItem(runashChatFavoritesCollapsedStorageKey)
    setIsFavoritesExpanded(savedFavoritesCollapsedValue !== "true")
    const savedRecentsCollapsedValue = localStorage.getItem(runashChatRecentsCollapsedStorageKey)
    setIsRecentsExpanded(savedRecentsCollapsedValue !== "true")

    const isBannerHidden =
      localStorage.getItem(runashChatBannerHiddenStorageKey) === "true" ||
      localStorage.getItem(runashChatUpdatesBannerHiddenStorageKey) === "true" ||
      localStorage.getItem(runashChatLegacyUpdatesBannerHiddenStorageKey) === "true"
    const hasSeenOnboarding =
      localStorage.getItem(runashChatOnboardingStorageKey) === "true" ||
      localStorage.getItem(runashChatUpdatesBannerSeenStorageKey) === "true"
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

    const storedGeneralSettings = localStorage.getItem(runashChatSettingsStorageKey)
    const { settings: restoredGeneralSettings, isValid } = parseRunashGeneralSettings(storedGeneralSettings)
    if (!isValid) {
      localStorage.setItem(runashChatSettingsStorageKey, JSON.stringify(restoredGeneralSettings))
    }
    setGeneralSettings(restoredGeneralSettings)
    setTheme(restoredGeneralSettings.appearance)
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

  useEffect(() => {
    localStorage.setItem(runashChatSettingsStorageKey, JSON.stringify(generalSettings))
  }, [generalSettings])

  useEffect(() => {
    setTheme(generalSettings.appearance)
  }, [generalSettings.appearance, setTheme])

  const markOnboardingSeen = () => {
    localStorage.setItem(runashChatOnboardingStorageKey, "true")
    localStorage.setItem(runashChatUpdatesBannerSeenStorageKey, "true")
  }

  const markOnboardingDismissed = () => {
    localStorage.setItem(runashChatBannerHiddenStorageKey, "true")
    localStorage.setItem(runashChatUpdatesBannerHiddenStorageKey, "true")
    localStorage.setItem(runashChatLegacyUpdatesBannerHiddenStorageKey, "true")
  }

  const restoreFocusToMainControls = () => {
    if (learnMoreTriggerRef.current instanceof HTMLElement) {
      learnMoreTriggerRef.current.focus()
      return
    }

    mainControlsRef.current?.focus()
  }

  const handleOpenOnboardingDialog = (triggerElement?: HTMLElement | null) => {
    setOnboardingStep(0)
    closeModal(false)
    closeSidebarActionMenu()
    rememberOverlayTrigger(triggerElement)
    setIsOnboardingOpen(true)
  }

  const handleOnboardingOpenChange = (open: boolean) => {
    if (open) {
      setIsOnboardingOpen(true)
      closeModal(false)
      closeSidebarActionMenu()
      return
    }

    setIsOnboardingOpen(false)
    setIsBannerDismissed(true)
    markOnboardingDismissed()
  }

  const handleOnboardingNext = () => {
    if (isLastOnboardingStep) {
      markOnboardingSeen()
      setIsOnboardingOpen(false)
      setIsBannerDismissed(true)
      return
    }

    setOnboardingStep((previousStep) => Math.min(previousStep + 1, onboardingSlides.length - 1))
  }

  useEffect(() => {
    localStorage.setItem(runashChatSidebarCollapsedStorageKey, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  useEffect(() => {
    localStorage.setItem(runashChatFavoritesCollapsedStorageKey, String(!isFavoritesExpanded))
  }, [isFavoritesExpanded])

  useEffect(() => {
    localStorage.setItem(runashChatRecentsCollapsedStorageKey, String(!isRecentsExpanded))
  }, [isRecentsExpanded])

  useEffect(() => {
    if (!overlayState.activeModal && !overlayState.sidebarActionMenu && !isOnboardingOpen) return

    setIsMobileSidebarOpen(false)
    setIsMobileSearchOpen(false)
  }, [overlayState.activeModal, overlayState.sidebarActionMenu, isOnboardingOpen])

  useEffect(() => {
    if (!overlayState.activeModal && !overlayState.sidebarActionMenu && !isMobileSidebarOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (overlayState.sidebarActionMenu) {
        closeSidebarActionMenu()
        return
      }

      if (!overlayState.activeModal) {
        setIsMobileSidebarOpen(false)
        return
      }

      if (overlayState.activeModal === "feedback" && isSubmittingFeedback) return

      dismissModal(overlayState.activeModal)
    }

    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("keydown", handleEscape)
    }
  }, [overlayState.sidebarActionMenu, overlayState.activeModal, isSubmittingFeedback, isMobileSidebarOpen])

  useEffect(() => {
    if (!overlayState.sidebarActionMenu && overlayState.activeModal !== "credits") return

    const handleOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target
      if (!(targetNode instanceof Node)) return

      const activeSidebarActionMenu = overlayState.sidebarActionMenu
      if (activeSidebarActionMenu) {
        const menuKey = getSidebarActionMenuKey(activeSidebarActionMenu.section, activeSidebarActionMenu.rowId)
        const menuTrigger = rowActionTriggerRefs.current[menuKey]
        const menuContent = rowActionContentRefs.current[menuKey]

        if (menuTrigger?.contains(targetNode) || menuContent?.contains(targetNode)) {
          return
        }

        closeSidebarActionMenu()
      }

      if (overlayState.activeModal !== "credits") {
        return
      }

      if (creditsPanelRef.current?.contains(targetNode) || creditsTriggerRef.current?.contains(targetNode)) {
        return
      }

      closeModal(true)
    }

    window.addEventListener("mousedown", handleOutsideInteraction)
    window.addEventListener("touchstart", handleOutsideInteraction)

    return () => {
      window.removeEventListener("mousedown", handleOutsideInteraction)
      window.removeEventListener("touchstart", handleOutsideInteraction)
    }
  }, [overlayState.sidebarActionMenu, overlayState.activeModal])

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
      const promptContext = {
        generateImagesEnabled,
        selectedModel,
        selectedProjectLabel: selectedProjectLabel === "Select a Project" ? null : selectedProjectLabel,
        uploadedAssetName,
      }

      try {
        let sid = sessionId
        if (!sid) {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "RunAsh Chat", promptContext }),
          })
          const created = await res.json()
          sid = created?.id ? String(created.id) : null
          setSessionId(sid ?? null)
        }

        localStorage.setItem("runash_initial_prompt_context", JSON.stringify(promptContext))

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

  const handlePromptAction = async (action: PromptActionConfig) => {
    const isDisabled = isPromptActionDisabled(action)

    if (isDisabled) {
      trackPromptAction(action, "disabled")
      toast({
        title: `${action.label} unavailable`,
        description: getPromptActionTooltip(action),
      })
      return
    }

    setActivePromptActionId(action.id)
    trackPromptAction(action, "opened")

    try {
      if (action.type === "route") {
        router.push(action.routeOrHandler)
        trackPromptAction(action, "success")
        return
      }

      if (action.type === "modal") {
        openModal(action.routeOrHandler as Exclude<ActiveModal, null>, mainControlsRef.current)
        trackPromptAction(action, "success")
        return
      }

      if (action.type === "service" && action.id === "search") {
        const searchQuery = prompt.trim()
        if (!searchQuery) {
          toast({
            title: "Enter a prompt first",
            description: "Add a search query in the composer, then run Search.",
          })
          return
        }

        setIsPromptActionLoading(true)
        const response = await fetch(`${action.routeOrHandler}?query=${encodeURIComponent(searchQuery)}`)
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || "Unable to run search")
        }

        const resultCount = Array.isArray(payload?.data?.results) ? payload.data.results.length : 0
        toast({
          title: `Search complete (${resultCount})`,
          description: resultCount > 0 ? "Search results are ready in your workflow." : "No results found for this query.",
        })
        trackPromptAction(action, "success")
        return
      }

      if (action.id === "enhance") {
        const trimmedPrompt = prompt.trim()
        if (!trimmedPrompt) {
          toast({
            title: "Add text to enhance",
            description: "Type a prompt first, then run Enhance.",
          })
          return
        }

        const enhancedPrompt = `Enhance this brief with clear goals, audience, and output format: ${trimmedPrompt}`
        setPrompt(enhancedPrompt)
        toast({ title: "Prompt enhanced", description: "Added structure to your prompt." })
        trackPromptAction(action, "success")
        return
      }

      if (action.id === "create") {
        startChatWithPrompt(prompt)
        trackPromptAction(action, "success")
      }
    } catch (error) {
      trackPromptAction(action, "error")
      toast({
        title: `${action.label} failed`,
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setIsPromptActionLoading(false)
    }
  }


  const runComposerMenuAsyncAction = async (actionId: ComposerMenuActionId, run: () => Promise<void> | void) => {
    setComposerMenuError(null)
    setComposerMenuActionLoadingId(actionId)

    try {
      await run()
      setIsComposerMenuOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete this action right now."
      setComposerMenuError(message)
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setComposerMenuActionLoadingId(null)
    }
  }

  const handleMenuRouteAction = (actionId: ComposerMenuActionId, route: string, successMessage: string) => {
    void runComposerMenuAsyncAction(actionId, async () => {
      router.push(route)
      toast({ title: successMessage })
    })
  }

  const handleComposerFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ""

    if (!selectedFile) {
      return
    }

    if (!isFileTypeAllowed(selectedFile)) {
      setComposerMenuError(`Unsupported file type. Please upload ${allowedUploadTypesLabel}.`)
      toast({
        title: "Upload blocked",
        description: `Unsupported file type. Please upload ${allowedUploadTypesLabel}.`,
        variant: "destructive",
      })
      return
    }

    setUploadedAssetName(selectedFile.name)
    setComposerMenuError(null)
    setIsComposerMenuOpen(false)
    toast({
      title: "File attached",
      description: `${selectedFile.name} will be included with your next prompt.`,
    })
  }

  const handleComposerMenuAction = (actionId: ComposerMenuActionId) => {
    switch (actionId) {
      case "import-github":
        handleMenuRouteAction(actionId, "/integrations?provider=github", "Opening GitHub import")
        return
      case "import-figma":
        handleMenuRouteAction(actionId, "/integrations?provider=figma", "Opening Figma import")
        return
      case "upload-from-computer":
        setComposerMenuError(null)
        setIsComposerMenuOpen(false)
        composerUploadInputRef.current?.click()
        return
      case "generate-images":
        setGenerateImagesEnabled((previousValue) => {
          const nextValue = !previousValue
          toast({
            title: nextValue ? "Generate Images enabled" : "Generate Images disabled",
            description: nextValue
              ? "Your next prompt will request image generation output."
              : "Prompts will not include image generation instructions.",
          })
          return nextValue
        })
        setIsComposerMenuOpen(false)
        return
      case "design-system-library":
        handleMenuRouteAction(actionId, "/editor?mode=design-system", "Opening design system library")
        return
      case "design-system-create":
        setPrompt((previousPrompt) => {
          const starter = "Create a reusable design system with color tokens, typography, spacing scale, and UI components."
          return previousPrompt.trim() ? `${previousPrompt}

${starter}` : starter
        })
        setIsComposerMenuOpen(false)
        toast({ title: "Design system instructions added" })
        return
      case "folder-new":
        handleMenuRouteAction(actionId, "/editor?intent=create-folder", "Opening new folder flow")
        return
      case "folder-open":
        handleMenuRouteAction(actionId, "/editor", "Opening projects and folders")
        return
      case "instructions":
        setPrompt((previousPrompt) => {
          const instructionStarter = `Instructions:
- Goal:
- Brand constraints:
- Expected output format:`
          return previousPrompt.trim() ? `${previousPrompt}

${instructionStarter}` : instructionStarter
        })
        setIsComposerMenuOpen(false)
        toast({ title: "Instruction template inserted" })
        return
      case "mcps-manage":
        handleMenuRouteAction(actionId, "/integrations?tab=mcps", "Opening MCP configuration")
        return
      case "mcps-explore":
        handleMenuRouteAction(actionId, "/integrations", "Opening MCP integrations")
        return
      default:
        return
    }
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
    markOnboardingDismissed()
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

  const closeFavoriteMenu = () => {
    closeSidebarActionMenu()
  }

  const handleFavoriteRemove = (favoriteId: string) => {
    setFavoriteItems((previousItems) => previousItems.filter((item) => item.id !== favoriteId))
    closeFavoriteMenu()
    toast({
      title: "Removed from favorites",
      description: "This item is no longer pinned to Favorites.",
    })
  }

  const handleFavoriteRename = (favoriteId: string) => {
    const item = favoriteItems.find((favoriteItem) => favoriteItem.id === favoriteId)
    if (!item) {
      closeFavoriteMenu()
      return
    }

    setRenameDialogTarget({
      entityType: "favorite",
      entityId: favoriteId,
      currentName: item.label,
    })
    setRenameInputValue(item.label)
    setRenameInputError(null)
    closeFavoriteMenu()
    setOverlayState((previousState) => ({ ...previousState, activeModal: "rename" }))
  }

  const handleFavoriteDeleteFolder = (favoriteId: string) => {
    const item = favoriteItems.find((favoriteItem) => favoriteItem.id === favoriteId)
    if (!item) {
      closeFavoriteMenu()
      return
    }

    closeFavoriteMenu()
    setConfirmDeletePayload({
      entityType: "folder",
      entityId: favoriteId,
      title: item.label,
      description: `Delete ${item.label}? This action cannot be undone.`,
    })
    setOverlayState((previousState) => ({ ...previousState, activeModal: "deleteConfirm" }))
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

        <div className="mt-4 min-h-0 flex-1 border-t border-zinc-800 pt-3.5">
          <ScrollArea className="h-full" ref={sidebarScrollAreaRef}>
            <div className="space-y-4 pr-2">
              {!collapsed ? (
                <section>
                  <button
                    type="button"
                    className="mb-2 flex w-full items-center justify-between rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                    onClick={() => setIsFavoritesExpanded((prev) => !prev)}
                    aria-expanded={isFavoritesExpanded}
                  >
                    <span className="flex items-center gap-2">
                      <span>Favorites</span>
                      <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] leading-none text-zinc-400">{favoriteItems.length}</span>
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${isFavoritesExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </button>

                  {isFavoritesExpanded ? (
                    <div className="space-y-1">
                      {favoriteItems.map((item) => {
                        const Icon = item.icon
                        const isMenuOpen = isSidebarActionMenuOpen("favorite", item.id)

                        return (
                          <div key={item.id} className="flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-zinc-900">
                            <button
                              type="button"
                              onClick={() => {
                                router.push(item.href)
                                if (isMobileDrawer) setIsMobileSidebarOpen(false)
                              }}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
                            >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-zinc-300">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1 pr-1">
                                <p className="truncate text-xs font-medium text-zinc-200">{item.label}</p>
                                <p className="truncate text-[11px] text-zinc-500">{item.description}</p>
                              </div>
                            </button>

                            <DropdownMenu
                              open={isMenuOpen}
                              onOpenChange={(open) => {
                                if (open) {
                                  openSidebarActionMenu("favorite", item.id)
                                  return
                                }

                                closeSidebarActionMenu()
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <button
                                  ref={(element) => {
                                    const menuKey = getSidebarActionMenuKey("favorite", item.id)
                                    rowActionTriggerRefs.current[menuKey] = element
                                  }}
                                  type="button"
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                                  aria-label={`Open actions for ${item.label}`}
                                >
                                  <span className="text-sm leading-none">...</span>
                                </button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                ref={(element) => {
                                  const menuKey = getSidebarActionMenuKey("favorite", item.id)
                                  rowActionContentRefs.current[menuKey] = element
                                }}
                                align="end"
                                sideOffset={6}
                                className={actionMenuContentClassName}
                              >
                                <DropdownMenuItem
                                  className={actionMenuItemClassName}
                                  onClick={() => handleFavoriteRemove(item.id)}
                                >
                                  Remove from Favorites
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={actionMenuItemClassName}
                                  onClick={() => handleFavoriteRename(item.id)}
                                >
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={actionMenuDangerItemClassName}
                                  onClick={() => {
                                    deleteActionTriggerRef.current = rowActionTriggerRefs.current[
                                      getSidebarActionMenuKey("favorite", item.id)
                                    ]
                                    handleFavoriteDeleteFolder(item.id)
                                  }}
                                >
                                  Delete folder
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                    className="mb-2 flex w-full items-center justify-between rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                    onClick={() => setIsRecentsExpanded((prev) => !prev)}
                    aria-expanded={isRecentsExpanded}
                  >
                    <span className="flex items-center gap-2">
                      <span>Recents</span>
                      <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] leading-none text-zinc-400">{sidebarRecents.length}</span>
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${isRecentsExpanded ? "rotate-0" : "-rotate-90"}`} />
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
                        <div
                          key={item.id}
                          className={`group flex items-center gap-1 rounded-md transition hover:bg-zinc-900 focus-within:bg-zinc-900 ${collapsed ? "px-1" : "px-2"}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isProject) {
                                handleProjectOpen(item.id.replace("project-", ""))
                              } else {
                                handleChatOpen(item.sessionId)
                              }
                              if (isMobileDrawer) setIsMobileSidebarOpen(false)
                            }}
                            className={`min-w-0 flex-1 rounded-md py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 ${collapsed ? "px-0 text-center" : ""}`}
                            title={collapsed ? item.title : undefined}
                          >
                            {collapsed ? (
                              <span className="text-xs text-zinc-400">{item.title.slice(0, 1).toUpperCase()}</span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900/70 text-zinc-300">
                                  <Icon className="h-3.5 w-3.5" />
                                </span>
                                <span className="min-w-0 flex-1 pr-1">
                                  <span className="block truncate text-xs font-medium text-zinc-200">{item.title}</span>
                                  <span className="block truncate text-[11px] text-zinc-500">
                                    {itemLabel} · {formatRecentTimestamp(item.updatedAt)}
                                  </span>
                                </span>
                              </span>
                            )}
                          </button>

                          {!collapsed ? (
                            <DropdownMenu
                              open={isSidebarActionMenuOpen("recent", item.id)}
                              onOpenChange={(open) => {
                                if (open) {
                                  openSidebarActionMenu("recent", item.id)
                                  return
                                }

                                closeSidebarActionMenu()
                              }}
                              modal={false}
                            >
                              <DropdownMenuTrigger asChild>
                                <button
                                  ref={(element) => {
                                    const menuKey = getSidebarActionMenuKey("recent", item.id)
                                    rowActionTriggerRefs.current[menuKey] = element
                                  }}
                                  type="button"
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 opacity-0 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 group-hover:opacity-100"
                                  aria-label={`Open actions for ${item.title}`}
                                >
                                  <span className="text-sm leading-none">...</span>
                                </button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                ref={(element) => {
                                  const menuKey = getSidebarActionMenuKey("recent", item.id)
                                  rowActionContentRefs.current[menuKey] = element
                                }}
                                align="end"
                                sideOffset={6}
                                collisionPadding={8}
                                sticky="always"
                                hideWhenDetached
                                collisionBoundary={sidebarScrollAreaRef.current ?? undefined}
                                className={actionMenuContentClassName}
                              >
                                <DropdownMenuItem
                                  className={actionMenuItemClassName}
                                  onClick={() => handleRecentShare(item)}
                                >
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={actionMenuItemClassName}
                                  onClick={() => handleRecentMove(item)}
                                >
                                  Move...
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={actionMenuItemClassName}
                                  onClick={() => handleRecentAddToFavorites(item)}
                                >
                                  Add to Favorites
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={actionMenuItemClassName}
                                  onClick={() => handleRecentRename(item)}
                                >
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className={actionMenuDangerItemClassName}
                                  onClick={() => {
                                    deleteActionTriggerRef.current = rowActionTriggerRefs.current[
                                      getSidebarActionMenuKey("recent", item.id)
                                    ]
                                    handleRecentDelete(item)
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
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
      <Dialog
        open={overlayState.activeModal === "deleteConfirm" && Boolean(confirmDeletePayload)}
        onOpenChange={(open) => !open && dismissModal("deleteConfirm")}
      >
        <DialogContent className={compactDarkDialogContentClassName}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-semibold text-zinc-100">Delete {confirmDeletePayload?.title}?</DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">{confirmDeletePayload?.description}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs leading-relaxed text-red-200">
            This action is permanent and cannot be undone.
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="ghost" className="text-zinc-300 hover:bg-zinc-900" onClick={() => closeDeleteConfirmModal(true)}>
              Cancel
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={overlayState.activeModal === "shareRecent" && Boolean(shareRecentItem)}
        onOpenChange={(open) => !open && dismissModal("shareRecent")}
      >
        <DialogContent className={darkDialogContentClassName}>
          <DialogHeader>
            <DialogTitle>Share item</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Share <span className="font-medium text-zinc-200">{shareRecentItem?.title}</span> using this link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input readOnly value={shareRecentItem ? buildRecentShareLink(shareRecentItem) : ""} className="border-zinc-800 bg-zinc-900 text-zinc-200" />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-zinc-300 hover:bg-zinc-900" onClick={() => dismissModal("shareRecent")}>
              Cancel
            </Button>
            <Button className="bg-cyan-600 text-white hover:bg-cyan-500" onClick={handleCopyRecentShareLink} disabled={!shareRecentItem || isCopyingRecentLink}>
              {isCopyingRecentLink ? "Copying..." : "Copy link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overlayState.activeModal === "move" && Boolean(moveRecentItem)} onOpenChange={(open) => !open && dismissModal("move")}>
        <DialogContent className={darkDialogContentClassName}>
          <DialogHeader>
            <DialogTitle>Move item</DialogTitle>
            <DialogDescription className="text-zinc-400">Choose where to move {moveRecentItem?.title}.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleMoveSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400" htmlFor="move-destination-select">
                Destination
              </label>
              <Select value={selectedMoveDestinationId} onValueChange={setSelectedMoveDestinationId}>
                <SelectTrigger id="move-destination-select" className="border-zinc-800 bg-zinc-900 text-zinc-200">
                  <SelectValue placeholder="Select folder or project" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  {recentMoveDestinations.map((destination) => (
                    <SelectItem key={destination.id} value={destination.id} className="focus:bg-zinc-900 focus:text-zinc-100">
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-zinc-100">{destination.label}</span>
                        <span className="text-xs text-zinc-500">{destination.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="text-zinc-300 hover:bg-zinc-900" onClick={closeMoveDialog} type="button">
                Cancel
              </Button>
              <Button className="bg-cyan-600 text-white hover:bg-cyan-500" type="submit" disabled={!selectedMoveDestinationId}>
                Move
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={overlayState.activeModal === "rename" && Boolean(renameDialogTarget)}
        onOpenChange={(open) => !open && dismissModal("rename")}
      >
        <DialogContent className={darkDialogContentClassName}>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription className="text-zinc-400">Enter a new name for {renameDialogTarget?.currentName}.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleRenameSubmit}>
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-zinc-400" htmlFor="rename-item-input">
                Name
              </label>
              <Input
                id="rename-item-input"
                value={renameInputValue}
                onChange={(event) => {
                  setRenameInputValue(event.target.value)
                  if (renameInputError) {
                    setRenameInputError(null)
                  }
                }}
                className="border-zinc-800 bg-zinc-900 text-zinc-200"
                autoFocus
              />
              {renameInputError ? <p className="text-xs text-red-300">{renameInputError}</p> : null}
            </div>
            <DialogFooter>
              <Button variant="ghost" className="text-zinc-300 hover:bg-zinc-900" onClick={closeRenameDialog} type="button">
                Cancel
              </Button>
              <Button className="bg-cyan-600 text-white hover:bg-cyan-500" type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isOnboardingOpen} onOpenChange={handleOnboardingOpenChange}>
        <DialogContent
          className="z-[60] w-[min(92vw,32rem)] max-w-[32rem] overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 motion-reduce:duration-0"
          aria-label="RunAsh chat updates"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            focusOverlayTrigger()
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => handleOnboardingOpenChange(false)}
            aria-label="Close updates dialog"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="max-h-[min(88vh,42rem)] overflow-y-auto rounded-lg">
            <div className="h-44 bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-zinc-900 p-4 sm:p-6">
              <div
                className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-black/20 text-6xl transition-transform duration-300 motion-reduce:transition-none"
                key={currentOnboardingSlide.title}
              >
                <span role="img" aria-label={currentOnboardingSlide.media.label}>
                  {currentOnboardingSlide.media.value}
                </span>
              </div>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle>{currentOnboardingSlide.title}</DialogTitle>
                <DialogDescription className="text-zinc-300">{currentOnboardingSlide.description}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2" aria-label="Onboarding progress" role="group">
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

      <Dialog open={isFeedbackOpen} onOpenChange={handleFeedbackOpenChange}>
        <DialogContent
          className="z-[60] w-[min(92vw,520px)] max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-[520px]"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            focusOverlayTrigger()
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => handleFeedbackOpenChange(false)}
            aria-label="Close feedback dialog"
            disabled={isSubmittingFeedback}
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>Give feedback</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tell us what worked well and what we can improve in your RunAsh Chat experience.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4" aria-label="Feedback form">
            <div className="space-y-2">
              <label htmlFor="feedback-text" className="text-sm font-medium text-zinc-200">
                Your feedback
              </label>
              <Textarea
                id="feedback-text"
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Share your feedback"
                rows={5}
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
                disabled={isSubmittingFeedback}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                required
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-zinc-200">Quick reaction (optional)</legend>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Select feedback sentiment">
                {feedbackRatingOptions.map(({ value, label, Icon }) => {
                  const isSelected = feedbackRating === value
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      onClick={() => setFeedbackRating(value)}
                      aria-pressed={isSelected}
                      className={`h-10 border-zinc-700 px-3 text-zinc-200 hover:bg-zinc-900 ${isSelected ? "border-zinc-500 bg-zinc-900" : ""}`}
                      disabled={isSubmittingFeedback}
                    >
                      <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {label}
                    </Button>
                  )
                })}
              </div>
            </fieldset>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleFeedbackOpenChange(false)} disabled={isSubmittingFeedback}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingFeedback || !feedbackText.trim()}>
                {isSubmittingFeedback ? "Submitting…" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={handleSettingsDialogOpenChange}>
        <DialogContent
          className="z-[80] w-[min(96vw,840px)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl shadow-black/40 sm:max-w-[840px]"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            focusOverlayTrigger()
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => handleSettingsDialogOpenChange(false)}
            aria-label="Close settings dialog"
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="sr-only">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage workspace settings from categorized controls.</DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[82dvh] grid-cols-1 sm:grid-cols-[248px_minmax(0,1fr)]">
            <aside className="border-b border-zinc-800 bg-zinc-900/40 sm:border-b-0 sm:border-r sm:bg-zinc-900/25">
              <div className="hidden border-b border-zinc-800 px-4 py-4 sm:block">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Settings</h2>
              </div>
              <ScrollArea className="w-full sm:h-[calc(82dvh-57px)]">
                <nav aria-label="Settings sections" role="tablist" className="flex min-w-max gap-1 p-2 sm:block sm:min-w-0 sm:space-y-1">
                  {settingsSections.map((section, index) => {
                    const isActive = activeSettingsSection === section
                    return (
                      <button
                        key={section}
                        ref={(element) => {
                          settingsSectionButtonRefs.current[index] = element
                        }}
                        type="button"
                        onClick={() => setActiveSettingsSection(section)}
                        onKeyDown={(event) => handleSettingsSectionKeyDown(event, index)}
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        className={`flex shrink-0 items-center rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:w-full ${
                          isActive
                            ? "border-zinc-700 bg-zinc-800 text-zinc-50"
                            : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200"
                        }`}
                      >
                        {section}
                      </button>
                    )
                  })}
                </nav>
              </ScrollArea>
            </aside>

            <section className="flex min-h-[320px] flex-col bg-zinc-950">
              <div className="px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
                <h3 className="text-lg font-semibold text-zinc-100 sm:text-xl">{activeSettingsSection}</h3>
              </div>
              <div className="border-b border-zinc-800" />
              <div className="flex-1 space-y-4 px-5 py-5 text-sm text-zinc-400 sm:px-6">
                {activeSettingsSection === "General" ? (
                  <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4 border-b border-zinc-800 px-4 py-3">
                      <span className="text-zinc-200">Appearance</span>
                      <Select
                        value={generalSettings.appearance}
                        onValueChange={(value) =>
                          setGeneralSettings((prev) => ({ ...prev, appearance: value as RunashThemePreference }))
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-zinc-700 bg-zinc-900 text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4 border-b border-zinc-800 px-4 py-3">
                      <span className="text-zinc-200">Accent color</span>
                      <Select
                        value={generalSettings.accentColor}
                        onValueChange={(value) =>
                          setGeneralSettings((prev) => ({ ...prev, accentColor: value as RunashAccentColorPreference }))
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-zinc-700 bg-zinc-900 text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="violet">Violet</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="emerald">Emerald</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4 border-b border-zinc-800 px-4 py-3">
                      <span className="text-zinc-200">Language</span>
                      <Select
                        value={generalSettings.language}
                        onValueChange={(value) =>
                          setGeneralSettings((prev) => ({ ...prev, language: value as RunashLanguagePreference }))
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-zinc-700 bg-zinc-900 text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-start gap-4 border-b border-zinc-800 px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-zinc-200">Spoken language</p>
                        <p className="text-xs text-zinc-500">Controls transcription and voice response language defaults.</p>
                      </div>
                      <Select
                        value={generalSettings.spokenLanguage}
                        onValueChange={(value) =>
                          setGeneralSettings((prev) => ({ ...prev, spokenLanguage: value as RunashSpokenLanguagePreference }))
                        }
                      >
                        <SelectTrigger className="h-8 w-full border-zinc-700 bg-zinc-900 text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="en-IN">English (India)</SelectItem>
                          <SelectItem value="es-ES">Spanish</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4 border-b border-zinc-800 px-4 py-3">
                      <span className="text-zinc-200">Voice</span>
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={generalSettings.voice}
                          onValueChange={(value) =>
                            setGeneralSettings((prev) => ({ ...prev, voice: value as RunashVoicePreference }))
                          }
                        >
                          <SelectTrigger className="h-8 w-[132px] border-zinc-700 bg-zinc-900 text-zinc-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alloy">Alloy</SelectItem>
                            <SelectItem value="verse">Verse</SelectItem>
                            <SelectItem value="willow">Willow</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-zinc-700 bg-zinc-900" aria-label="Play selected voice sample" disabled>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-start gap-4 border-b border-zinc-800 px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-zinc-200">Separate Voice</p>
                        <p className="text-xs text-zinc-500">Use a distinct voice profile for generated speech output.</p>
                      </div>
                      <div className="flex justify-end">
                        <Switch
                          checked={generalSettings.separateVoiceEnabled}
                          onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, separateVoiceEnabled: checked }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4 px-4 py-3">
                      <span className="text-zinc-200">Show additional models</span>
                      <div className="flex justify-end">
                        <Switch
                          checked={generalSettings.showAdditionalModels}
                          onCheckedChange={(checked) => setGeneralSettings((prev) => ({ ...prev, showAdditionalModels: checked }))}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>Use this section to review and update your {activeSettingsSection.toLowerCase()} settings.</p>
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-zinc-300">
                      Additional controls for <span className="font-medium text-zinc-100">{activeSettingsSection}</span> will appear here.
                    </div>
                  </>
                )}
                <Button type="button" variant="outline" className="w-fit" onClick={() => router.push("/settings")}>Open full settings page</Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReferOpen} onOpenChange={handleReferDialogOpenChange}>
        <DialogContent
          className="z-[60] w-[min(94vw,34rem)] max-h-[90dvh] overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/40 sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            focusOverlayTrigger()
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => handleReferDialogOpenChange(false)}
            aria-label="Close refer dialog"
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="space-y-2 border-b border-zinc-800/80 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <Sparkles className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              {referralUiData.headline}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Share your referral link and unlock monthly credits for every verified signup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-0 overflow-y-auto px-6 py-4">
            <section className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-400">
                <span>Monthly progress</span>
                <span>{referralUiData.progressValue} / {referralUiData.rewardCap} invites</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full border border-zinc-700/70 bg-zinc-900"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={referralUiData.rewardCap}
                aria-valuenow={referralUiData.progressValue}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400"
                  style={{ width: `${referralProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] uppercase tracking-wide text-zinc-500">
                <span>Start · 0 invites</span>
                <span>Goal · {referralUiData.rewardCap} invites</span>
              </div>
            </section>

            <section className="space-y-3 border-t border-zinc-800/80 py-4">
              <p className="text-sm font-medium text-zinc-200">Referral link</p>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2">
                <code className="flex-1 truncate rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-300">{referralUiData.referralLink}</code>
                <Button type="button" className="h-10 px-4" onClick={handleCopyReferralLink} disabled={isCopyingLink}>
                  {isCopyingLink ? (
                    <>
                      <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </section>

            <section className="space-y-2 border-t border-zinc-800/80 py-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-sm font-medium text-zinc-200">How it works</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
                  {referralUiData.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2 border-t border-zinc-800/80 px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={() => handleReferDialogOpenChange(false)}
            >
              Maybe later
            </Button>
            <Button type="button" className="h-10 px-4" onClick={() => router.push("/pricing?tab=roi")}>Run the numbers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUpgradeModalOpen} onOpenChange={handleUpgradeModalOpenChange}>
        <DialogContent
          className="z-[60] w-[min(94vw,48rem)] max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-2xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            focusOverlayTrigger()
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 h-8 w-8 rounded-full text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => handleUpgradeModalOpenChange(false)}
            aria-label="Close upgrade dialog"
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>Explore More Plans</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Pick a plan to preview pricing and key benefits for your current stage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1 sm:grid-cols-5" role="tablist" aria-label="Select plan tier">
              {upgradePlans.map((plan) => {
                const isSelected = selectedPlan === plan.id
                return (
                  <Button
                    key={plan.id}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    className={`h-9 px-2 text-xs sm:text-sm ${isSelected ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-200" : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"}`}
                    onClick={() => setSelectedPlan(plan.id)}
                    role="tab"
                    aria-selected={isSelected}
                  >
                    {plan.label}
                  </Button>
                )
              })}
            </div>

            <Card className="border-zinc-800 bg-zinc-900/60 p-5">
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-400">{selectedUpgradePlan.label} plan</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">{formatPlanPriceLabel(selectedUpgradePlan)}</p>
                </div>
                <p className="text-sm text-zinc-300">{selectedUpgradePlan.description}</p>
                <ul className="space-y-2">
                  {selectedUpgradePlan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-zinc-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button type="button" className="w-full sm:w-auto" onClick={handlePlanCtaClick} disabled={isPlanActionLoading}>
                  {isPlanActionLoading ? "Opening…" : selectedUpgradePlan.ctaLabel}
                </Button>
              </div>
            </Card>
          </div>

          <DialogFooter className="sm:justify-between">
            <button
              type="button"
              className="text-sm text-cyan-300 underline-offset-4 hover:underline"
              onClick={() => router.push("/pricing")}
            >
              See full plan comparison on pricing page
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRedeemDialogOpen} onOpenChange={handleRedeemDialogOpenChange}>
        <DialogContent className="w-[92vw] max-w-sm border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>Redeem Credit Code</DialogTitle>
            <DialogDescription className="text-zinc-400">Enter your code to apply credits in billing.</DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleRedeemCodeSubmit}>
            <div className="space-y-1.5">
              <label htmlFor={redeemCodeInputId} className="text-xs font-medium uppercase tracking-wide text-zinc-300">
                Code
              </label>
              <Input
                id={redeemCodeInputId}
                value={redeemCodeInput}
                onChange={(event) => {
                  const sanitizedValue = sanitizeRedeemCode(event.target.value)
                  setRedeemCodeInput(sanitizedValue)
                  if (redeemCodeError) {
                    setRedeemCodeError(null)
                  }
                }}
                placeholder="RUNASH-2026"
                autoComplete="off"
                maxLength={32}
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
              />
              {redeemCodeError ? <p className="text-xs text-rose-300">{redeemCodeError}</p> : null}
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleRedeemDialogOpenChange(false)} disabled={isRedeemingCode}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-600 text-zinc-950 hover:bg-cyan-500" disabled={isRedeemingCode}>
                {isRedeemingCode ? "Redeeming..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div
        className={`mx-auto flex w-full max-w-[1400px] gap-4 px-3 py-3 ${chatPositionPreference === "right" ? "lg:flex-row-reverse" : "lg:flex-row"}`}
      >
        <aside
          id="runash-chat-sidebar"
          className={`hidden h-[calc(100vh-24px)] shrink-0 rounded-xl border border-zinc-800 bg-black/70 p-2.5 lg:flex lg:flex-col ${
            isSidebarCollapsed ? "w-16" : "w-[250px]"
          }`}
          aria-label="Sidebar"
        >
          <div className={`mb-1.5 flex ${isSidebarCollapsed ? "justify-center" : "justify-end"}`}>
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
                className={`sticky top-0 ${isMobileSidebarOpen || isOnboardingOpen || overlayState.activeModal ? "z-0" : "z-20"} rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-2 backdrop-blur`}
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
                    disabled={isOnboardingOpen}
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
                        disabled={isOnboardingOpen}
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
                  disabled={isOnboardingOpen}
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
                      disabled={isOnboardingOpen}
                    >
                      <Search className="h-[18px] w-[18px] stroke-[1.75]" />
                    </Button>
                  <Button
                    type="button"
                    size="icon"
                    className="h-[42px] w-[42px] rounded-xl bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => startChatWithPrompt()}
                    aria-label="Start a new chat"
                    disabled={isOnboardingOpen}
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
                        disabled={isOnboardingOpen}
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
                          onClick={(event) => handleHeaderActionClick(action, event.currentTarget)}
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

            <div
              className={`sticky top-0 mb-5 space-y-3 rounded-2xl border border-transparent bg-gradient-to-b from-[#050607]/95 via-[#050607]/92 to-transparent px-1 pt-1 backdrop-blur-sm sm:mb-6 ${
                isMobileSidebarOpen || isOnboardingOpen || overlayState.activeModal ? "z-0" : "z-20"
              }`}
            >
              {isBannerDismissed === false && (
                <div
                  className="relative mx-auto w-full max-w-3xl rounded-lg border border-zinc-700/70 bg-zinc-900/85 px-9 py-2 text-zinc-100 shadow-[0_10px_28px_-22px_rgba(34,211,238,0.55)] backdrop-blur-sm sm:px-10"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs leading-relaxed sm:text-sm">
                    <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-200">
                      New
                    </span>
                    <p className="text-zinc-300">Chat composer updates are live with quicker launch actions.</p>
                    <Button
                      variant="link"
                      ref={learnMoreTriggerRef}
                      className="h-auto p-0 text-xs font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200 sm:text-sm"
                      onClick={(event) => handleOpenOnboardingDialog(event.currentTarget)}
                    >
                      Learn More
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    onClick={dismissUpdatesBanner}
                    aria-label="Dismiss updates banner"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

            <header className="relative grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="hidden md:block" aria-hidden="true" />
              <div className="flex min-w-0 items-center justify-center gap-2.5 text-center sm:gap-3">
                <div className="rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 p-1.5 sm:p-2">
                  <Bot className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-zinc-400 sm:text-sm">RunAsh Agent Workspace</p>
                  <h1 className="truncate text-lg font-semibold text-zinc-100 sm:text-xl">What do you want to create?</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5 md:col-start-3">
                <div className="hidden items-center gap-1.5 lg:flex">
                  {headerActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.id === "upgrade" ? "outline" : "ghost"}
                      className={
                        action.id === "upgrade"
                          ? upgradeCtaClassName
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                      }
                      onClick={(event) => handleHeaderActionClick(action, event.currentTarget)}
                      aria-label={action.label}
                    >
                      <action.icon className="mr-1.5 h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  ))}
                </div>

                <div className="hidden items-center gap-1.5 md:flex lg:hidden">
                  {primaryTabletHeaderActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.id === "upgrade" ? "outline" : "ghost"}
                      className={
                        action.id === "upgrade"
                          ? upgradeCtaClassName
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                      }
                      onClick={(event) => handleHeaderActionClick(action, event.currentTarget)}
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
                            onClick={(event) => handleHeaderActionClick(action, event.currentTarget)}
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

                <div className="relative hidden md:block">
                  {isCreditsOpen && (
                    <button
                      type="button"
                      aria-label="Close credit balance panel"
                      className="fixed inset-0 z-20 hidden bg-black/40 md:block"
                      onClick={() => closeCreditsPanel(true)}
                    />
                  )}

                  <Button
                    ref={creditsTriggerRef}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full border-zinc-700 bg-zinc-950 px-2.5 text-xs font-medium text-zinc-100 hover:bg-zinc-900"
                    onClick={(event) => {
                      if (isCreditsOpen) {
                        closeCreditsPanel(true)
                        return
                      }

                      openModal("credits", event.currentTarget)
                    }}
                    aria-label="View credit balance details"
                    aria-expanded={isCreditsOpen}
                    aria-controls={creditsPanelId}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                    <span>{creditsBalanceLabel}</span>
                  </Button>

                  {isCreditsOpen && (
                    <div
                      ref={creditsPanelRef}
                      id={creditsPanelId}
                      role="dialog"
                      aria-label="Credit balance"
                      className="absolute right-0 top-full z-30 mt-2.5 w-72 rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-sm text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Credit Balance</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          onClick={() => closeCreditsPanel(true)}
                          aria-label="Close credit balance panel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {creditSummaryRows.map((row) => (
                          <div key={row.key} className="flex items-center justify-between rounded-md bg-zinc-900/80 px-2 py-1.5">
                            <span className="text-zinc-300">{row.label}</span>
                            <span className="font-medium text-zinc-100">{formatCreditValue(creditMetrics[row.key])}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                          onClick={(event) => openRedeemCodeDialog(event.currentTarget)}
                        >
                          Redeem Code
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
                          onClick={() => {
                            closeCreditsPanel(false)
                            router.push("/pricing?intent=credits")
                          }}
                        >
                          Buy Credits
                        </Button>
                      </div>
                    </div>
                  )}
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
                              variant={action.id === "upgrade" ? "outline" : "ghost"}
                              className={
                                action.id === "upgrade"
                                  ? `h-8 w-8 ${upgradeCtaClassName}`
                                  : "h-8 w-8 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                              }
                              onClick={(event) => handleHeaderActionClick(action, event.currentTarget)}
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
                          {overflowMobileHeaderActions.map((action) => (
                            <DropdownMenuItem
                              key={action.id}
                              onClick={(event) => handleHeaderActionClick(action, event.currentTarget)}
                              className="focus:bg-zinc-800 focus:text-zinc-100"
                            >
                              <action.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem
                            onClick={(event) => handleOpenOnboardingDialog(event.currentTarget)}
                            className="focus:bg-zinc-800 focus:text-zinc-100"
                          >
                            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                            Credits: {creditsBalanceLabel}
                          </DropdownMenuItem>
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
            </div>

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
                  <div className="border-t border-zinc-800 px-3 py-2.5 sm:px-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">Prompt actions</p>
                      <DropdownMenu open={isComposerMenuOpen} onOpenChange={setIsComposerMenuOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full border border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800"
                            aria-label="Open command launcher"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72 border-zinc-800 bg-zinc-900 text-zinc-100">
                          <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">Import</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleComposerMenuAction("import-github")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Import GitHub</span>
                            {composerMenuActionLoadingId === "import-github" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleComposerMenuAction("import-figma")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            <LayoutTemplate className="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Import Figma</span>
                            {composerMenuActionLoadingId === "import-figma" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleComposerMenuAction("upload-from-computer")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Upload from computer</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />

                          <DropdownMenuItem onSelect={() => handleComposerMenuAction("generate-images")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Generate Images</span>
                            <Switch checked={generateImagesEnabled} aria-label="Enable generate images" className="ml-auto" />
                          </DropdownMenuItem>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="focus:bg-zinc-800 focus:text-zinc-100">
                              <PanelsTopLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                              <span>Design System</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-60 border-zinc-800 bg-zinc-900 text-zinc-100">
                              <DropdownMenuItem onSelect={() => handleComposerMenuAction("design-system-library")} className="focus:bg-zinc-800 focus:text-zinc-100">
                                <Library className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Open library</span>
                                {composerMenuActionLoadingId === "design-system-library" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleComposerMenuAction("design-system-create")} className="focus:bg-zinc-800 focus:text-zinc-100">
                                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Create from prompt</span>
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="focus:bg-zinc-800 focus:text-zinc-100">
                              <FolderKanban className="mr-2 h-4 w-4" aria-hidden="true" />
                              <span>Folder</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-60 border-zinc-800 bg-zinc-900 text-zinc-100">
                              <DropdownMenuItem onSelect={() => handleComposerMenuAction("folder-new")} className="focus:bg-zinc-800 focus:text-zinc-100">
                                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>New folder</span>
                                {composerMenuActionLoadingId === "folder-new" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleComposerMenuAction("folder-open")} className="focus:bg-zinc-800 focus:text-zinc-100">
                                <FolderKanban className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Browse folders</span>
                                {composerMenuActionLoadingId === "folder-open" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          <DropdownMenuItem onSelect={() => handleComposerMenuAction("instructions")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                            <span>Instructions</span>
                          </DropdownMenuItem>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="focus:bg-zinc-800 focus:text-zinc-100">
                              <PlugZap className="mr-2 h-4 w-4" aria-hidden="true" />
                              <span>MCPs</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-60 border-zinc-800 bg-zinc-900 text-zinc-100">
                              <DropdownMenuItem onSelect={() => handleComposerMenuAction("mcps-manage")} className="focus:bg-zinc-800 focus:text-zinc-100">
                                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Manage MCPs</span>
                                {composerMenuActionLoadingId === "mcps-manage" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleComposerMenuAction("mcps-explore")} className="focus:bg-zinc-800 focus:text-zinc-100">
                                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Explore integrations</span>
                                {composerMenuActionLoadingId === "mcps-explore" && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <input
                      ref={composerUploadInputRef}
                      type="file"
                      accept={allowedUploadExtensions.join(",")}
                      className="hidden"
                      onChange={handleComposerFileSelection}
                      aria-label="Upload prompt attachment"
                    />
                    {composerMenuActionLoadingId && (
                      <p className="mb-2 inline-flex items-center gap-2 text-xs text-zinc-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Processing menu action…
                      </p>
                    )}
                    {uploadedAssetName && <p className="mb-2 text-xs text-cyan-300">Attached file: {uploadedAssetName}</p>}
                    {composerMenuError && <p className="mb-2 text-xs text-amber-300">{composerMenuError}</p>}
                    <TooltipProvider delayDuration={120}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={togglePromptRecording}
                          disabled={!isSpeechRecognitionSupported}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                            isRecordingPrompt
                              ? "border-red-500/80 bg-red-500/15 text-red-200"
                              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                          }`}
                          aria-label={isRecordingPrompt ? "Stop voice input" : "Start voice input"}
                          aria-pressed={isRecordingPrompt}
                        >
                          <Mic className="h-3.5 w-3.5" />
                          <span>{isRecordingPrompt ? "Stop" : "Voice"}</span>
                        </button>
                        {isRecordingPrompt && (
                          <button
                            type="button"
                            onClick={cancelPromptRecording}
                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                            aria-label="Cancel voice input"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSpeechInsertMode("append")}
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] transition ${
                            speechInsertMode === "append"
                              ? "border-cyan-500/80 bg-cyan-500/15 text-cyan-200"
                              : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                          }`}
                          aria-pressed={speechInsertMode === "append"}
                        >
                          Append
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpeechInsertMode("replace")}
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] transition ${
                            speechInsertMode === "replace"
                              ? "border-cyan-500/80 bg-cyan-500/15 text-cyan-200"
                              : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                          }`}
                          aria-pressed={speechInsertMode === "replace"}
                        >
                          Replace
                        </button>
                        {promptActionConfigs.map((action) => {
                          const actionDisabled = isPromptActionDisabled(action)
                          const actionIsActive = activePromptActionId === action.id

                          return (
                            <Tooltip key={action.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => void handlePromptAction(action)}
                                  disabled={actionDisabled || isPromptActionLoading}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                    actionIsActive
                                      ? "border-cyan-500/80 bg-cyan-500/15 text-cyan-200"
                                      : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                                  } ${actionDisabled ? "cursor-not-allowed border-zinc-800 text-zinc-600" : ""}`}
                                  aria-pressed={actionIsActive}
                                >
                                  <action.icon className="h-3.5 w-3.5" />
                                  <span>{action.label}</span>
                                  {action.requiresPlan && (
                                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                                      Pro
                                    </span>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="border-zinc-800 bg-zinc-900 text-zinc-100">{getPromptActionTooltip(action)}</TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    </TooltipProvider>
                    {!isSpeechRecognitionSupported && (
                      <p className="mt-2 text-xs text-amber-300">Voice input is unavailable in this browser. Use Chrome, Edge, or Safari.</p>
                    )}
                    {isRecordingPrompt && (
                      <p className="mt-2 inline-flex items-center gap-2 text-xs text-red-300">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" aria-hidden="true" />
                        Recording… speak now.
                      </p>
                    )}
                    {isRecordingPrompt && speechTranscriptPreview && (
                      <p className="mt-1 text-xs text-zinc-400">{speechTranscriptPreview}</p>
                    )}
                    {speechErrorMessage && <p className="mt-2 text-xs text-amber-300">{speechErrorMessage}</p>}
                  </div>
                  <div className="border-t border-zinc-800 px-3 py-2.5 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                        <Bot className="h-3.5 w-3.5" />
                        Model
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 max-w-[220px] rounded-full border border-zinc-700 bg-zinc-950 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
                          >
                            <span className="truncate">{selectedModel}</span>
                            <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900 text-zinc-100">
                          <DropdownMenuItem onClick={() => setSelectedModel("v0 Mini")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            v0 Mini
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedModel("v0 Max")} className="focus:bg-zinc-800 focus:text-zinc-100">
                            v0 Max
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="border-t border-zinc-800 px-3 py-2.5 sm:px-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500">
                        <FolderKanban className="h-3.5 w-3.5" />
                        Project
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 w-full justify-between gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-3 text-xs font-normal text-zinc-300 hover:bg-zinc-800 sm:w-auto sm:min-w-[220px]"
                          >
                            <span className="truncate">{selectedProjectLabel}</span>
                            <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-900 text-zinc-100">
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
                  <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2.5 sm:px-4">
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
                    <p className="hidden text-[11px] text-zinc-500 sm:block">Press Enter to send, Shift+Enter for a new line.</p>
                  </div>
                </div>
              </div>

              {!isComposerUpgradeHelperDismissed && (
                <div className="border-t border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 text-xs text-zinc-400 sm:px-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="leading-relaxed text-zinc-300">
                      Upgrade to Team for shared projects, model controls, and workspace collaboration.
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`ml-2 h-7 rounded-full px-2.5 text-[11px] ${upgradeCtaClassName}`}
                        onClick={(event) => openUpgradeModal("team", event.currentTarget)}
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

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">Recent Projects</h2>
                  <button type="button" className="text-xs text-zinc-500 transition hover:text-zinc-300" onClick={() => router.push("/editor")}>
                    View All
                  </button>
                </div>

                {loadingRecents ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                        className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 text-left transition hover:border-zinc-700 hover:bg-zinc-900/70"
                      >
                        <div
                          className={`mb-2.5 flex h-20 items-end rounded-md border border-zinc-700/70 bg-gradient-to-br p-2 ${projectThumbnailClasses[Number(item.id.length) % projectThumbnailClasses.length]}`}
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
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-zinc-100">My Chats</h2>
                  <button type="button" className="text-xs text-zinc-500 transition hover:text-zinc-300" onClick={() => router.push("/chat")}>
                    View All
                  </button>
                </div>
                <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-zinc-800/80 bg-zinc-900/30 px-2.5 py-1.5 text-[11px] text-zinc-500">
                  <span>{loadingSession ? "Syncing previews…" : `${messagesPreview.length} preview snippets loaded`}</span>
                  {previewError ? <span className="text-amber-300">Preview unavailable</span> : <span className="text-zinc-400">Workspace sync</span>}
                </div>

                {loadingRecents ? (
                  <div className="space-y-1.5">
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
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                              <span className="rounded border border-zinc-700 px-1.5 py-0.5">{getRecentStatus(item.updatedAt)}</span>
                              <span>{formatRecentTimestamp(item.updatedAt)}</span>
                            </div>
                          </div>
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
                          <DropdownMenuContent align="end" className="w-48 border-zinc-800 bg-zinc-900 p-1.5 text-zinc-100">
                            <DropdownMenuItem
                              className="cursor-pointer rounded-sm px-2.5 py-1.5 focus:bg-zinc-800 focus:text-zinc-100"
                              onClick={() => handleChatOpen(item.sessionId)}
                            >
                              Open chat
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer rounded-sm px-2.5 py-1.5 focus:bg-zinc-800 focus:text-zinc-100"
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
