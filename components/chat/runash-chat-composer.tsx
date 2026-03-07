"use client"

import { type ChangeEvent, type ClipboardEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, Send, Sparkles, Search, OctagonX, RotateCcw, Image as ImageIcon, RefreshCcw, X, PencilLine } from "lucide-react"

type StreamControllerState = "idle" | "sending" | "streaming" | "stopping" | "failed"
type ComposerHealthState = "ready" | "usage-limit" | "provider-error" | "network-timeout"
type ResponseTone = "balanced" | "friendly" | "professional"
type ResponseDetailLevel = "concise" | "normal" | "detailed"

type ModelCatalogOption = {
  id: string
  provider: string
  label: string
}

type ProjectCatalogOption = {
  id: string
  label: string
}

export type ComposerAttachmentMetadata = {
  name: string
  size: number
  type: string
  width?: number
  height?: number
}

export type ComposerAttachmentUploadState = "idle" | "uploading" | "failed" | "uploaded"

export type ComposerAttachmentPreview = {
  id: string
  metadata: ComposerAttachmentMetadata
  previewUrl: string
  uploadState: ComposerAttachmentUploadState
  error?: string
}

type RunAshChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: (message?: string) => void
  disabled?: boolean
  placeholder?: string
  streamState?: StreamControllerState
  composerHealth?: ComposerHealthState
  onRetry?: () => void
  onStop?: () => void
  tone?: ResponseTone
  onToneChange?: (tone: ResponseTone) => void
  detailLevel?: ResponseDetailLevel
  onDetailLevelChange?: (level: ResponseDetailLevel) => void
  modelOptions?: ModelCatalogOption[]
  selectedModel?: string
  onSelectedModelChange?: (model: string) => void
  projectOptions?: ProjectCatalogOption[]
  selectedProject?: string
  onSelectedProjectChange?: (projectId: string) => void
  onAttachFiles?: (files: File[]) => Promise<void> | void
  attachmentPreviews?: ComposerAttachmentPreview[]
  attachmentError?: string | null
  onRetryAttachment?: (attachmentId: string) => void
  onRemoveAttachment?: (attachmentId: string) => void
  showUpgradePrompt?: boolean
  onUpgradeClick?: (location: "composer_inline") => void
}

const UPGRADE_PROMPT_DISMISSED_KEY = "runash_upgrade_prompt_dismissed_v1"

type SlashCommand = {
  command: string
  label: string
  template: string
}

const PRODUCT_SUGGESTION_MIN_LENGTH = 2
const SOFT_CHARACTER_LIMIT = 1200
const HARD_CHARACTER_LIMIT = 2000
const SOFT_TOKEN_LIMIT = 320
const HARD_TOKEN_LIMIT = 500
const ATTACHMENT_MAX_COUNT = 4
const ATTACHMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/campaign",
    label: "Create promo campaign",
    template: "Create a short promo campaign workflow with 3 hooks, CTA timing, and a follow-up sequence.",
  },
  {
    command: "/inventory",
    label: "Draft inventory automation",
    template: "Draft an inventory automation plan with reorder thresholds, low-stock alerts, and vendor fallback logic.",
  },
  {
    command: "/voice",
    label: "Generate voice-first script",
    template: "Generate a voice-friendly script for a live product walkthrough with objection handling and CTA moments.",
  },
  {
    command: "/enhance",
    label: "Enhance current prompt",
    template: "",
  },
]

const COMPOSER_CONTROL_HEIGHT_RADIUS_CLASS = "h-9 rounded-xl"
const COMPOSER_CONTROL_GROUP_GAP_CLASS = "gap-2"
const SECONDARY_ACTION_BUTTON_CLASS =
  `${COMPOSER_CONTROL_HEIGHT_RADIUS_CLASS} border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`
const ATTACHMENT_ACTION_BUTTON_CLASS =
  `${COMPOSER_CONTROL_HEIGHT_RADIUS_CLASS} border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`

export function RunAshChatComposer({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Ask about organic products, recipes, sustainability tips, or retail automation...",
  streamState = "idle",
  composerHealth = "ready",
  onRetry,
  onStop,
  tone = "balanced",
  onToneChange,
  detailLevel = "normal",
  onDetailLevelChange,
  modelOptions = [],
  selectedModel,
  onSelectedModelChange,
  projectOptions = [],
  selectedProject,
  onSelectedProjectChange,
  onAttachFiles,
  attachmentPreviews = [],
  attachmentError,
  onRetryAttachment,
  onRemoveAttachment,
  showUpgradePrompt = false,
  onUpgradeClick,
}: RunAshChatComposerProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showSecondaryControls, setShowSecondaryControls] = useState(false)
  const [dragState, setDragState] = useState<"idle" | "active" | "invalid">("idle")
  const [attachmentValidationError, setAttachmentValidationError] = useState<string | null>(null)

  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const [upgradePromptDismissed, setUpgradePromptDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(UPGRADE_PROMPT_DISMISSED_KEY) === "1"
  })

  const attachmentInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mediaQuery = window.matchMedia("(pointer: coarse)")
    const updateInputMode = () => setIsTouchDevice(mediaQuery.matches)
    updateInputMode()
    mediaQuery.addEventListener("change", updateInputMode)
    return () => mediaQuery.removeEventListener("change", updateInputMode)
  }, [])

  const estimatedTokens = useMemo(() => Math.ceil(value.length / 4), [value])
  const isNearCharLimit = value.length >= SOFT_CHARACTER_LIMIT
  const isNearTokenLimit = estimatedTokens >= SOFT_TOKEN_LIMIT
  const isHardLimitExceeded = value.length > HARD_CHARACTER_LIMIT || estimatedTokens > HARD_TOKEN_LIMIT

  const filteredSlashCommands = useMemo(() => {
    if (!value.startsWith("/")) return []
    const query = value.toLowerCase()
    return SLASH_COMMANDS.filter((item) => item.command.startsWith(query))
  }, [value])

  function validateAttachmentBatch(files: File[]) {
    const accepted: File[] = []
    const issues: string[] = []

    if (attachmentPreviews.length >= ATTACHMENT_MAX_COUNT) {
      return {
        accepted,
        error: `Attachment limit reached (${ATTACHMENT_MAX_COUNT}). Remove one and retry.`,
      }
    }

    const availableSlots = ATTACHMENT_MAX_COUNT - attachmentPreviews.length
    const candidates = files.slice(0, availableSlots)
    if (files.length > availableSlots) {
      issues.push(`Only ${availableSlots} more attachment${availableSlots === 1 ? "" : "s"} allowed.`)
    }

    for (const file of candidates) {
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        issues.push(`${file.name}: unsupported type.`)
        continue
      }

      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
        issues.push(`${file.name}: exceeds 8 MB.`)
        continue
      }

      accepted.push(file)
    }

    return {
      accepted,
      error: issues.length > 0 ? issues.join(" ") : null,
    }
  }

  function queueAttachments(files: File[]) {
    if (!onAttachFiles || files.length === 0) return
    const { accepted, error } = validateAttachmentBatch(files)
    setAttachmentValidationError(error)
    if (accepted.length > 0) {
      void onAttachFiles(accepted)
    }
  }

  async function fetchSuggestions(query: string) {
    if (query.length < PRODUCT_SUGGESTION_MIN_LENGTH || query.startsWith("/")) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=5`)
      if (!response.ok) return
      const data = (await response.json()) as Array<{ name?: string; title?: string }>
      const nextSuggestions = data.map((item) => item.name || item.title).filter((item): item is string => Boolean(item))
      setSuggestions(nextSuggestions)
      setShowSuggestions(nextSuggestions.length > 0)
    } catch {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  function applySlashCommand(command: SlashCommand) {
    setComposerError(null)
    setShowSuggestions(false)

    if (command.command === "/enhance") {
      void enhancePrompt()
      return
    }

    onChange(command.template)
  }

  async function enhancePrompt() {
    if (!value.trim()) {
      setComposerError("Add a base prompt first, then use Enhance Prompt.")
      return
    }

    setIsEnhancing(true)
    setComposerError(null)

    try {
      const response = await fetch("/api/prompts/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, length: "medium" }),
      })
      if (!response.ok) {
        throw new Error("enhance_failed")
      }
      const data = (await response.json()) as { enhanced?: string }
      if (!data.enhanced) {
        throw new Error("empty_enhancement")
      }
      onChange(data.enhanced)
      setComposerError(null)
    } catch {
      setComposerError("Prompt enhancement is temporarily unavailable. You can still send your draft as-is.")
    } finally {
      setIsEnhancing(false)
    }
  }

  function handleSubmit(message?: string) {
    const content = (message ?? value).trim()

    if (!content) {
      setComposerError("Add a prompt before sending. Tip: type / to open RunAsh templates.")
      return
    }

    if (attachmentPreviews.some((item) => item.uploadState === "failed")) {
      setComposerError("Fix the image upload issue before sending.")
      return
    }

    if (attachmentPreviews.some((item) => item.uploadState === "uploading")) {
      setComposerError("Please wait for the image upload to finish.")
      return
    }

    if (content.startsWith("/") && !SLASH_COMMANDS.some((command) => command.command === content.split(" ")[0])) {
      setComposerError("Unknown slash command. Use /campaign, /inventory, /voice, or /enhance.")
      return
    }

    if (isHardLimitExceeded) {
      setComposerError("Prompt is over the composer limit. Shorten it or split it into smaller steps.")
      return
    }

    setComposerError(null)
    setSuggestions([])
    setShowSuggestions(false)
    onSend(content)
  }

  function handleAttachmentSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    queueAttachments(files)
    event.target.value = ""
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (!onAttachFiles) return
    const files = Array.from(event.clipboardData.files ?? [])
    if (files.length === 0) return
    queueAttachments(files)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragState("idle")

    if (!onAttachFiles || isTouchDevice) return
    const files = Array.from(event.dataTransfer.files ?? [])
    queueAttachments(files)
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(UPGRADE_PROMPT_DISMISSED_KEY, upgradePromptDismissed ? "1" : "0")
  }, [upgradePromptDismissed])

  const shouldShowUpgradePrompt = showUpgradePrompt && !upgradePromptDismissed
  const isStreaming = streamState === "sending" || streamState === "streaming"
  const isRetryableFailure = streamState === "failed" || composerHealth === "provider-error" || composerHealth === "network-timeout"
  const hasPrimaryError = Boolean(composerError) || Boolean(attachmentError) || Boolean(attachmentValidationError)
  const hasFailedAttachment = attachmentPreviews.some((item) => item.uploadState === "failed")
  const hasUploadingAttachment = attachmentPreviews.some((item) => item.uploadState === "uploading")
  const isBusy = isStreaming || streamState === "stopping" || isEnhancing || hasUploadingAttachment
  const canSend = !disabled && !isBusy && !isHardLimitExceeded && !hasFailedAttachment && Boolean(value.trim())
  const showInlineUpgradePrompt = shouldShowUpgradePrompt && composerHealth === "ready" && !hasPrimaryError && !isRetryableFailure
  const footerHelperCopy = isRetryableFailure
    ? "Request interrupted. Use Retry to continue from where it stopped."
    : onAttachFiles
      ? isTouchDevice
        ? `Attach up to ${ATTACHMENT_MAX_COUNT} images (PNG/JPG/WEBP/GIF, 8 MB each). Tap Attach to upload.`
        : `Attach up to ${ATTACHMENT_MAX_COUNT} images (PNG/JPG/WEBP/GIF, 8 MB each). Drag/drop, paste, or use Attach.`
      : "Use templates or Advanced options to refine your prompt."
  const sendButtonLabel =
    streamState === "stopping"
      ? "Stopping..."
      : isStreaming
        ? "Sending..."
        : isRetryableFailure && !value.trim()
          ? "Retry send"
          : "Send"

  return (
    <div className="space-y-2.5">
      <div
        className={`rounded-2xl border bg-zinc-900/90 p-3 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.9)] transition-colors ${dragState === "active" ? "border-orange-400 bg-zinc-900" : dragState === "invalid" ? "border-red-500/80 bg-red-950/20" : "border-zinc-700/80"}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!onAttachFiles || isTouchDevice) return
          const files = Array.from(event.dataTransfer.items ?? []).filter((item) => item.kind === "file")
          const availableSlots = ATTACHMENT_MAX_COUNT - attachmentPreviews.length
          const anyInvalid = files.some((item) => item.type.length > 0 && !ALLOWED_ATTACHMENT_TYPES.includes(item.type))
          setDragState(anyInvalid || files.length > availableSlots ? "invalid" : "active")
        }}
        onDragLeave={() => setDragState("idle")}
        onDrop={handleDrop}
      >
        <Textarea
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value
            onChange(nextValue)
            void fetchSuggestions(nextValue)
            if (composerError) setComposerError(null)
          }}
          onKeyDown={(event) => {
            if ((event.nativeEvent as KeyboardEvent).isComposing) return
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
              event.preventDefault()
              void enhancePrompt()
              return
            }

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              if (canSend || value.trim()) {
                handleSubmit()
              } else if (
                isRetryableFailure &&
                onRetry &&
                attachmentPreviews.length === 0 &&
                !isBusy &&
                !isHardLimitExceeded &&
                !disabled &&
                !value.trim()
              ) {
                onRetry()
              }
            }
          }}
          onPaste={handlePaste}
          rows={4}
          placeholder={placeholder}
          className="min-h-[88px] resize-y border-0 bg-transparent px-1 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
          aria-invalid={Boolean(composerError)}
          disabled={disabled || streamState === "stopping"}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`flex flex-wrap items-center ${COMPOSER_CONTROL_GROUP_GAP_CLASS}`}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSecondaryControls((previous) => !previous)}
              aria-expanded={showSecondaryControls}
              aria-controls="composer-secondary-controls"
              className={SECONDARY_ACTION_BUTTON_CLASS}
            >
              Advanced options
              <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${showSecondaryControls ? "rotate-180" : ""}`} />
            </Button>
            {onAttachFiles ? (
              <>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAttachmentSelect}
                  aria-label="Attach image"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={disabled || isBusy || attachmentPreviews.length >= ATTACHMENT_MAX_COUNT}
                  className={SECONDARY_ACTION_BUTTON_CLASS}
                  aria-label="Attach image"
                >
                  <ImageIcon className="mr-1 h-3.5 w-3.5" />
                  Attach
                </Button>
              </>
            ) : null}
            <span className="basis-full text-zinc-400 sm:basis-auto">Type / for templates • Ctrl/Cmd+Shift+P to polish</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-500">
            <span className={isNearCharLimit ? "text-amber-400" : ""}>{value.length}/{HARD_CHARACTER_LIMIT} chars</span>
            <span className={isNearTokenLimit ? "text-amber-400" : ""}>{estimatedTokens}/{HARD_TOKEN_LIMIT} tokens</span>
          </div>
        </div>

        {showSecondaryControls ? (
          <div id="composer-secondary-controls" className={`mt-2 flex flex-wrap items-center border-t border-zinc-800 pt-2 text-xs text-zinc-400 ${COMPOSER_CONTROL_GROUP_GAP_CLASS}`}>
            {modelOptions.length > 0 && onSelectedModelChange ? (
              <label className="flex items-center gap-1">
                Model
                <select
                  value={selectedModel}
                  onChange={(event) => onSelectedModelChange(event.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                  aria-label="Select chat model"
                >
                  {modelOptions.map((option) => (
                    <option key={`${option.provider}:${option.id}`} value={option.id}>
                      {option.label} ({option.provider})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {projectOptions.length > 0 && onSelectedProjectChange ? (
              <label className="flex items-center gap-1">
                Project
                <select
                  value={selectedProject}
                  onChange={(event) => onSelectedProjectChange(event.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                  aria-label="Select chat project"
                >
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void enhancePrompt()}
              disabled={disabled || isBusy}
              className={ATTACHMENT_ACTION_BUTTON_CLASS}
              aria-label="Enhance prompt"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {isEnhancing ? "Enhancing..." : "Enhance Prompt"}
            </Button>
          </div>
        ) : null}

        {attachmentPreviews.length > 0 ? (
          <div className={`mt-3 flex flex-wrap items-center rounded-xl border border-zinc-700/80 bg-zinc-950/70 p-2 ${COMPOSER_CONTROL_GROUP_GAP_CLASS}`}>
            <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Attachment actions:</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {attachmentPreviews.map((attachment) => (
                <div key={attachment.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-2 py-1.5 text-xs text-zinc-300">
                  <img src={attachment.previewUrl} alt={attachment.metadata.name} className="h-9 w-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">{attachment.metadata.name}</p>
                    <p className={attachment.uploadState === "failed" ? "text-red-300" : "text-zinc-400"}>
                      {Math.max(1, Math.round(attachment.metadata.size / 1024))} KB
                      {attachment.error ? ` • ${attachment.error}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${attachment.uploadState === "failed" ? "border-red-500/70 text-red-300" : attachment.uploadState === "uploading" ? "border-amber-500/70 text-amber-300" : "border-emerald-500/70 text-emerald-300"}`}>
                    {attachment.uploadState === "failed" ? "Failed" : attachment.uploadState === "uploading" ? "Uploading" : "Ready"}
                  </span>
                  {attachment.uploadState === "failed" && onRetryAttachment ? (
                    <Button type="button" variant="outline" size="sm" className={ATTACHMENT_ACTION_BUTTON_CLASS} onClick={() => onRetryAttachment(attachment.id)}>
                      <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Retry
                    </Button>
                  ) : null}
                  {onRemoveAttachment ? (
                    <Button type="button" variant="outline" size="sm" className={ATTACHMENT_ACTION_BUTTON_CLASS} onClick={() => onRemoveAttachment(attachment.id)} disabled={disabled || isBusy}>
                      <X className="mr-1 h-3.5 w-3.5" /> Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            {onAttachFiles ? (
              <Button type="button" variant="outline" size="sm" className={ATTACHMENT_ACTION_BUTTON_CLASS} onClick={() => attachmentInputRef.current?.click()} disabled={disabled || isBusy || attachmentPreviews.length >= ATTACHMENT_MAX_COUNT}>
                <PencilLine className="mr-1 h-3.5 w-3.5" /> Add more
              </Button>
            ) : null}
          </div>
        ) : null}

        {attachmentValidationError ? (
          <div className="mt-2 rounded-md border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
            {attachmentValidationError} <span className="text-amber-100">Recovery: remove files that exceed limits and retry attach, paste, or drop.</span>
          </div>
        ) : null}
      </div>


      <div className={`flex flex-wrap items-center justify-between text-xs text-zinc-500 ${COMPOSER_CONTROL_GROUP_GAP_CLASS}`}>
        <span>Enter to send • Shift+Enter newline • Controls are keyboard accessible.</span>
        <div className={`flex flex-wrap items-center ${COMPOSER_CONTROL_GROUP_GAP_CLASS}`}>
          {isRetryableFailure && onRetry ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className={`${COMPOSER_CONTROL_HEIGHT_RADIUS_CLASS} border-amber-700 text-amber-200 hover:bg-amber-950`}
              disabled={disabled || isBusy}
              aria-label="Retry previous request"
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Retry
            </Button>
          ) : null}
          {isStreaming && onStop ? (
            <Button
              type="button"
              variant="outline"
              onClick={onStop}
              className={`${COMPOSER_CONTROL_HEIGHT_RADIUS_CLASS} border-red-700 text-red-200 hover:bg-red-950`}
              aria-label="Stop generating response"
            >
              <OctagonX className="mr-1 h-4 w-4" /> Stop
            </Button>
          ) : null}
          <Button
            onClick={() => handleSubmit()}
            disabled={!canSend}
            className={`${COMPOSER_CONTROL_HEIGHT_RADIUS_CLASS} bg-orange-500 px-4 font-semibold text-zinc-950 hover:bg-orange-400`}
            aria-label="Send prompt"
          >
            <Send className="mr-1 h-4 w-4" />
            {sendButtonLabel}
          </Button>
        </div>
      </div>

      {composerHealth !== "ready" ? (
        <div className="rounded-md border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          {composerHealth === "usage-limit" ? "Usage limit reached. Wait for your quota window, then retry." : null}
          {composerHealth === "provider-error" ? "Provider temporarily unavailable. Retry in place to continue." : null}
          {composerHealth === "network-timeout" ? "Network timeout while streaming. Retry in place to resume." : null}
          {onRetry ? (
            <Button type="button" variant="link" className="h-auto px-1 py-0 text-amber-200" onClick={onRetry}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry now
            </Button>
          ) : null}
        </div>
      ) : null}

      {value.startsWith("/") && (
        <div className="rounded-md border border-zinc-700 bg-zinc-950/80 p-2 text-xs text-zinc-300">
          {filteredSlashCommands.length > 0 ? (
            filteredSlashCommands.map((item) => (
              <button
                key={item.command}
                type="button"
                className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                onClick={() => applySlashCommand(item)}
              >
                <span>{item.command}</span>
                <span className="text-zinc-500">{item.label}</span>
              </button>
            ))
          ) : (
            <p>No slash template matched. Try /campaign, /inventory, /voice, or /enhance.</p>
          )}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="rounded-md border border-zinc-700 bg-zinc-900">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="flex w-full items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              onClick={() => {
                onChange(suggestion)
                setShowSuggestions(false)
                setComposerError(null)
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {composerError ? (
        <div className="rounded-md border border-red-700/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {composerError} <span className="text-red-300/90">Recovery: simplify the prompt or use Enhance Prompt.</span>
        </div>
      ) : null}

      {attachmentError ? (
        <div className="rounded-md border border-red-700/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">{attachmentError}</div>
      ) : null}

      {showSecondaryControls ? (
        <div className="rounded-md border border-zinc-700 bg-zinc-900/60 p-2 text-xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-zinc-400">
              Tone
              <select
                value={tone}
                onChange={(event) => onToneChange?.(event.target.value as ResponseTone)}
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                aria-label="Select response tone"
              >
                <option value="balanced">Balanced</option>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
              </select>
            </label>

            <div className="flex items-center gap-1" role="group" aria-label="Output detail level">
              {(["concise", "normal", "detailed"] as ResponseDetailLevel[]).map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={detailLevel === level ? "secondary" : "outline"}
                  className="h-7 px-2 text-[11px] capitalize"
                  onClick={() => onDetailLevelChange?.(level)}
                  aria-pressed={detailLevel === level}
                  aria-label={`Set output detail to ${level}`}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-400">
        {showInlineUpgradePrompt ? (
          <div className="flex items-center justify-between gap-2 text-zinc-300">
            <span>
              Need higher usage limits?{" "}
              <a
                href="/upgrade"
                className="text-amber-300 underline underline-offset-2"
                onClick={() => onUpgradeClick?.("composer_inline")}
              >
                Upgrade your plan
              </a>
              .
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-zinc-500 hover:text-zinc-200"
              onClick={() => setUpgradePromptDismissed(true)}
              aria-label="Dismiss upgrade prompt"
            >
              Dismiss
            </Button>
          </div>
        ) : onAttachFiles ? (
          <span className="inline-flex items-center gap-1">
            <span className="rounded-full border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">Attachment hint</span>
            <ImageIcon className="h-3 w-3" />
            {footerHelperCopy}
          </span>
        ) : (
          <span>{footerHelperCopy}</span>
        )}
      </div>
    </div>
  )
}

