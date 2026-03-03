export interface StreamStatus {
  isLive: boolean
  title: string
  description: string
  startTime?: string
  duration?: number
  viewerCount: number
  platforms: PlatformStatus[]
}

export interface PlatformStatus {
  id: string
  name: string
  platform: string
  isActive: boolean
  viewerCount: number
  chatCount: number
}

export interface ChatMessage {
  id: string
  platform: string
  username: string
  message: string
  timestamp: string
  cursor?: string
  clientRequestId?: string
  isHighlighted?: boolean
  isModerator?: boolean
  isSubscriber?: boolean
}

export interface ChatAttachmentMetadata {
  id?: string
  url?: string
  name: string
  size: number
  type: string
  width?: number
  height?: number
  checksum?: string
}

export interface MobileChatListResponse {
  messages: ChatMessage[]
  cursor: string
}

export interface MobileSendChatMessageRequest {
  platform: string
  username: string
  message: string
  clientRequestId?: string
  attachments?: ChatAttachmentMetadata[]
  isModerator?: boolean
  isSubscriber?: boolean
}

export interface MobileSendChatMessageResponse {
  message: ChatMessage
  deduped?: boolean
}

export interface StreamAnalytics {
  viewerCount: number
  peakViewers: number
  chatMessages: number
  newFollowers: number
  watchTime: number
  platformBreakdown: {
    platform: string
    viewers: number
    percentage: number
  }[]
}

export interface NotificationSettings {
  streamStart: boolean
  highViewerCount: boolean
  chatMentions: boolean
  newFollowers: boolean
  scheduledStreams: boolean
}

export interface MobileSettings {
  darkMode: "system" | "light" | "dark"
  notifications: NotificationSettings
  dataUsage: "low" | "medium" | "high"
  chatDelay: number
  biometricAuth: boolean
}

export interface ScheduledStream {
  id: string
  title: string
  description: string
  scheduledDate: string
  duration: number
  platforms: string[]
  isRecurring: boolean
  recurrencePattern?: {
    frequency: "daily" | "weekly" | "monthly"
    interval: number
    daysOfWeek?: number[]
    endDate?: string
  }
  thumbnail?: string
  tags: string[]
  category: string
  isPublic: boolean
  notificationTime: number
  templateId?: string
  createdAt: string
  updatedAt: string
  version?: number
}

export interface MobileScheduleSyncMetadata {
  lastSyncedAt: string
  pendingChanges: number
}

export interface MobileScheduleListResponse {
  streams: ScheduledStream[]
  sync: MobileScheduleSyncMetadata
}

export interface MobileCreateScheduleRequest {
  title: string
  description?: string
  scheduledDate: string
  duration: number
  platforms: string[]
  isRecurring?: boolean
  recurrencePattern?: ScheduledStream["recurrencePattern"]
  tags?: string[]
  category?: string
  isPublic?: boolean
  notificationTime?: number
  templateId?: string
}

export interface MobileUpdateScheduleRequest extends Partial<MobileCreateScheduleRequest> {
  expectedVersion?: number
}

export interface MobileCreateScheduleResponse {
  stream: ScheduledStream
  sync: MobileScheduleSyncMetadata
}

export interface MobileScheduleMutationResponse {
  stream?: ScheduledStream
  conflict?: boolean
  sync: MobileScheduleSyncMetadata
}

export type MobileCreateScheduleResult = MobileScheduleMutationResponse
