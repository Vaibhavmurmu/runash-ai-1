"use client"

import { useState, useCallback, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/components/analytics-provider"

// Types for moderation
export interface ModerationSettings {
  enabled: boolean
  sensitivityLevel: "low" | "medium" | "high"
  autoDeleteEnabled: boolean
  filterProfanity: boolean
  filterHateSpeech: boolean
  filterSpam: boolean
  filterPII: boolean
  customBlockedWords: string[]
  userBanThreshold: number
}

export interface ModerationResult {
  isApproved: boolean
  score: number
  categories: {
    profanity: number
    hateSpeech: number
    spam: number
    pii: number
  }
  flaggedWords: string[]
  action: "allow" | "flag" | "block"
  reason?: string
}

export interface ModeratedMessage {
  messageId: string
  originalContent: string
  moderationResult: ModerationResult
  timestamp: Date
  userId: string
  userName: string
  isResolved: boolean
}

// Default moderation settings
const defaultSettings: ModerationSettings = {
  enabled: true,
  sensitivityLevel: "medium",
  autoDeleteEnabled: true,
  filterProfanity: true,
  filterHateSpeech: true,
  filterSpam: true,
  filterPII: false,
  customBlockedWords: [],
  userBanThreshold: 3,
}

// Simulate AI moderation API call
const simulateAIModeration = async (message: string, settings: ModerationSettings): Promise<ModerationResult> => {
  // In a real implementation, this would be an API call to an AI moderation service
  await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate API delay

  // List of words to check against (simplified for demo)
  const profanityList = ["badword1", "badword2", "badword3"]
  const hateSpeechList = ["hateword1", "hateword2"]
  const spamPatterns = ["buy now", "click here", "free money"]
  const piiPatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Emails
  ]

  // Add custom blocked words
  const allBlockedWords = [
    ...(settings.filterProfanity ? profanityList : []),
    ...(settings.filterHateSpeech ? hateSpeechList : []),
    ...settings.customBlockedWords,
  ]

  // Check for blocked words
  const lowerMessage = message.toLowerCase()
  const flaggedWords: string[] = []

  // Check for profanity and hate speech
  allBlockedWords.forEach((word) => {
    if (lowerMessage.includes(word.toLowerCase())) {
      flaggedWords.push(word)
    }
  })

  // Check for spam patterns
  let spamScore = 0
  if (settings.filterSpam) {
    spamPatterns.forEach((pattern) => {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        spamScore += 0.3
        flaggedWords.push(pattern)
      }
    })

    // Check for excessive capitalization
    const capsPercentage = (message.match(/[A-Z]/g)?.length || 0) / message.length
    if (capsPercentage > 0.7 && message.length > 5) {
      spamScore += 0.3
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(message)) {
      spamScore += 0.2
    }
  }

  // Check for PII
  let piiScore = 0
  if (settings.filterPII) {
    piiPatterns.forEach((pattern) => {
      if (pattern.test(message)) {
        piiScore += 0.8
        flaggedWords.push("PII detected")
      }
    })
  }

  // Calculate category scores
  const profanityScore = settings.filterProfanity
    ? flaggedWords.filter((w) => profanityList.includes(w)).length * 0.3
    : 0

  const hateSpeechScore = settings.filterHateSpeech
    ? flaggedWords.filter((w) => hateSpeechList.includes(w)).length * 0.5
    : 0

  // Calculate total score based on sensitivity
  const sensitivityMultiplier =
    settings.sensitivityLevel === "low" ? 0.7 : settings.sensitivityLevel === "high" ? 1.3 : 1

  const totalScore = (profanityScore + hateSpeechScore + spamScore + piiScore) * sensitivityMultiplier

  // Determine action based on score
  let action: "allow" | "flag" | "block" = "allow"
  let reason: string | undefined

  if (totalScore > 0.8) {
    action = "block"
    reason = "Content violates community guidelines"
  } else if (totalScore > 0.3) {
    action = "flag"
    reason = "Content may violate community guidelines"
  }

  return {
    isApproved: action === "allow",
    score: totalScore,
    categories: {
      profanity: profanityScore,
      hateSpeech: hateSpeechScore,
      spam: spamScore,
      pii: piiScore,
    },
    flaggedWords,
    action,
    reason,
  }
}

export function useChatModeration() {
  const [settings, setSettings] = useState<ModerationSettings>(defaultSettings)
  const [flaggedMessages, setFlaggedMessages] = useState<ModeratedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { trackEvent } = useAnalytics()

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("chatModerationSettings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error("Failed to parse saved moderation settings", error)
      }
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("chatModerationSettings", JSON.stringify(settings))
  }, [settings])

  // Moderate a message
  const moderateMessage = useCallback(
    async (message: string, userId: string, userName: string): Promise<ModerationResult> => {
      if (!settings.enabled) {
        return {
          isApproved: true,
          score: 0,
          categories: { profanity: 0, hateSpeech: 0, spam: 0, pii: 0 },
          flaggedWords: [],
          action: "allow",
        }
      }

      setIsLoading(true)
      try {
        const result = await simulateAIModeration(message, settings)

        // Track moderation event
        trackEvent("message_moderated", {
          action: result.action,
          score: result.score,
          categories: result.categories,
        })

        // Add to flagged messages if not approved
        if (result.action !== "allow") {
          const moderatedMessage: ModeratedMessage = {
            messageId: Date.now().toString(),
            originalContent: message,
            moderationResult: result,
            timestamp: new Date(),
            userId,
            userName,
            isResolved: false,
          }

          setFlaggedMessages((prev) => [moderatedMessage, ...prev])

          // Show toast for moderators/admins
          toast({
            title: "Message flagged by AI moderation",
            description: `${result.action === "block" ? "Blocked" : "Flagged"}: "${message.substring(0, 30)}${message.length > 30 ? "..." : ""}"`,
            variant: "destructive",
          })
        }

        return result
      } catch (error) {
        console.error("Error in AI moderation:", error)
        // Fail open - allow message if moderation fails
        return {
          isApproved: true,
          score: 0,
          categories: { profanity: 0, hateSpeech: 0, spam: 0, pii: 0 },
          flaggedWords: [],
          action: "allow",
        }
      } finally {
        setIsLoading(false)
      }
    },
    [settings, toast, trackEvent],
  )

  // Update moderation settings
  const updateSettings = useCallback((newSettings: Partial<ModerationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }, [])

  // Resolve a flagged message
  const resolveFlaggedMessage = useCallback(
    (messageId: string, action: "approve" | "reject") => {
      setFlaggedMessages((prev) =>
        prev.map((msg) =>
          msg.messageId === messageId
            ? {
                ...msg,
                isResolved: true,
                moderationResult: {
                  ...msg.moderationResult,
                  action: action === "approve" ? "allow" : "block",
                  isApproved: action === "approve",
                },
              }
            : msg,
        ),
      )

      trackEvent("moderation_review", {
        messageId,
        action,
      })

      toast({
        title: `Message ${action === "approve" ? "approved" : "rejected"}`,
        description: "The moderation decision has been updated.",
      })
    },
    [toast, trackEvent],
  )

  // Clear resolved messages
  const clearResolvedMessages = useCallback(() => {
    setFlaggedMessages((prev) => prev.filter((msg) => !msg.isResolved))
  }, [])

  return {
    settings,
    updateSettings,
    moderateMessage,
    flaggedMessages,
    resolveFlaggedMessage,
    clearResolvedMessages,
    isLoading,
  }
}
