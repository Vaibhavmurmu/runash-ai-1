"use client"

import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, Send, Sparkles, Search, OctagonX, RotateCcw, Image as ImageIcon, RefreshCcw, X } from "lucide-react"

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
  onAttachFile?: (file: File) => Promise<void> | void
  attachmentPreview?: ComposerAttachmentPreview | null
  attachmentError?: string | null
  onRetryAttachment?: () => void
  onRemoveAttachment?: () => void
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
  onAttachFile,
  attachmentPreview,
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
  const [isDragging, setIsDragging] = useState(false)
  const [upgradePromptDismissed, setUpgradePromptDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(UPGRADE_PROMPT_DISMISSED_KEY) === "1"
  })
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)

  const estimatedTokens = useMemo(() => Math.ceil(value.length / 4), [value])
  const isNearCharLimit = value.length >= SOFT_CHARACTER_LIMIT
  const isNearTokenLimit = estimatedTokens >= SOFT_TOKEN_LIMIT
  const isHardLimitExceeded = value.length > HARD_CHARACTER_LIMIT || estimatedTokens > HARD_TOKEN_LIMIT

  const filteredSlashCommands = useMemo(() => {
    if (!value.startsWith("/")) return []
    const query = value.toLowerCase()
    return SLASH_COMMANDS.filter((item) => item.command.startsWith(query))
  }, [value])

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

    if (attachmentPreview?.uploadState === "failed") {
      setComposerError("Fix the image upload issue before sending.")
      return
    }

    if (attachmentPreview?.uploadState === "uploading") {
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
    const file = event.target.files?.[0]
    if (!file) return
    void onAttachFile?.(file)
    event.target.value = ""
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files?.[0]
    if (!file || !onAttachFile) return
    void onAttachFile(file)
  }

  const attachmentStatusMessage =
    attachmentPreview?.uploadState === "uploading"
      ? "Uploading image..."
      : attachmentPreview?.uploadState === "failed"
        ? attachmentPreview.error || "Upload failed. Please retry."
        : attachmentPreview?.uploadState === "uploaded"
          ? "Image ready to send."
          : null

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(UPGRADE_PROMPT_DISMISSED_KEY, upgradePromptDismissed ? "1" : "0")
  }, [upgradePromptDismissed])

  const shouldShowUpgradePrompt = showUpgradePrompt && !upgradePromptDismissed

  return (
    <div className="space-y-2">
      <div
        className={`rounded-md border bg-zinc-900 p-2 transition-colors ${isDragging ? "border-orange-400" : "border-zinc-700"}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!onAttachFile) return
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
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
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
              event.preventDefault()
              void enhancePrompt()
              return
            }

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              handleSubmit()
            }
          }}
          rows={4}
          placeholder={placeholder}
          className="min-h-[96px] resize-y border-0 bg-transparent text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
          aria-invalid={Boolean(composerError)}
          disabled={disabled}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSecondaryControls((previous) => !previous)}
              aria-expanded={showSecondaryControls}
              aria-controls="composer-secondary-controls"
              className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              Advanced options
              <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${showSecondaryControls ? "rotate-180" : ""}`} />
            </Button>
            <span className="text-zinc-500">Type / for RunAsh templates • Ctrl/Cmd+Shift+P to polish</span>
          </div>

          <div className="flex items-center gap-3 text-zinc-500">
            <span className={isNearCharLimit ? "text-amber-400" : ""}>{value.length}/{HARD_CHARACTER_LIMIT} chars</span>
            <span className={isNearTokenLimit ? "text-amber-400" : ""}>{estimatedTokens}/{HARD_TOKEN_LIMIT} tokens</span>
          </div>
        </div>

        {showSecondaryControls ? (
          <div id="composer-secondary-controls" className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-2 text-xs text-zinc-400">
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
              disabled={disabled || isEnhancing}
              className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              aria-label="Enhance prompt"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {isEnhancing ? "Enhancing..." : "Enhance Prompt"}
            </Button>
          </div>
        ) : null}

        {attachmentPreview ? (
          <div className="mt-3 rounded-md border border-zinc-700 bg-zinc-950/70 p-2">
            <div className="flex gap-2">
              <img src={attachmentPreview.previewUrl} alt={attachmentPreview.metadata.name} className="h-20 w-20 rounded border border-zinc-700 object-cover" />
              <div className="min-w-0 flex-1 text-xs text-zinc-300">
                <p className="truncate font-medium text-zinc-100">{attachmentPreview.metadata.name}</p>
                <p>{Math.max(1, Math.round(attachmentPreview.metadata.size / 1024))} KB</p>
                {attachmentStatusMessage ? (
                  <p className={attachmentPreview.uploadState === "failed" ? "text-red-300" : "text-zinc-400"}>{attachmentStatusMessage}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {attachmentPreview.uploadState === "failed" && onRetryAttachment ? (
                    <Button type="button" variant="outline" size="sm" className="h-7 border-zinc-600 bg-zinc-900 text-zinc-200" onClick={onRetryAttachment}>
                      <RefreshCcw className="mr-1 h-3.5 w-3.5" /> Retry
                    </Button>
                  ) : null}
                  {onAttachFile ? (
                    <Button type="button" variant="outline" size="sm" className="h-7 border-zinc-600 bg-zinc-900 text-zinc-200" onClick={() => attachmentInputRef.current?.click()}>
                      Replace
                    </Button>
                  ) : null}
                  {onRemoveAttachment ? (
                    <Button type="button" variant="outline" size="sm" className="h-7 border-zinc-600 bg-zinc-900 text-zinc-200" onClick={onRemoveAttachment}>
                      <X className="mr-1 h-3.5 w-3.5" /> Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
                className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-zinc-800"
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
              className="flex w-full items-center px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>Enter to send • Shift+Enter newline • Controls are keyboard accessible.</span>
        <div className="flex items-center gap-2">
          {onAttachFile ? (
            <>
              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAttachmentSelect}
                aria-label="Attach image"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => attachmentInputRef.current?.click()}
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                aria-label="Attach image"
              >
                <ImageIcon className="mr-1 h-4 w-4" />
                Image
              </Button>
            </>
          ) : null}
          {(streamState === "sending" || streamState === "streaming") && onStop ? (
            <Button type="button" variant="outline" onClick={onStop} className="border-red-700 text-red-200 hover:bg-red-950">
              <OctagonX className="mr-1 h-4 w-4" /> Stop
            </Button>
          ) : null}
          <Button
            onClick={() => handleSubmit()}
            disabled={disabled || !value.trim() || isHardLimitExceeded || attachmentPreview?.uploadState === "uploading"}
            className="bg-orange-500 px-4 font-semibold text-zinc-950 hover:bg-orange-400"
            aria-label="Send prompt"
          >
            <Send className="mr-1 h-4 w-4" />
            Send
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-400">
        {shouldShowUpgradePrompt ? (
          <div className="flex items-center justify-between gap-2">
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
        ) : null}
        {onAttachFile ? <span className={shouldShowUpgradePrompt ? "mt-1 block" : ""}>Drag and drop an image on desktop, or tap the image button on mobile.</span> : null}
      </div>
    </div>
  )
}
