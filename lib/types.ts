// Core app types (no external service dependencies)

export type SubscriptionTier = "free" | "pro" | "ultra"

export type UUID = string

export interface Profile {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
}

export type StreamStatus = "scheduled" | "live" | "ended" | "paused"

export type Stream = {
  id: UUID
  user_id: UUID
  title: string
  description: string | null
  category: string
  status: "live" | "scheduled" | "ended"
  stream_key: string | null
  rtmp_url: string | null
  thumbnail_url: string | null
  scheduled_start: string | null
  actual_start: string | null
  actual_end: string | null
  max_viewers: number
  total_revenue: number
  ai_agent_id: UUID | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AgentType = "sales" | "engagement" | "analytics" | "moderation"
export type AgentStatus = "active" | "idle" | "disabled"

export interface AIAgent {
  id: string
  user_id: string
  name: string
  type: AgentType
  status: AgentStatus
  performance_score: number
  tasks_completed: number
  current_task?: string | null
  enabled: boolean
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export type Product = {
  id: UUID
  user_id: UUID
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  in_stock: boolean
  featured: boolean
  sales_count: number
  inventory_count: number
  created_at: string
  updated_at: string
}

export type StreamMetric = {
  id: UUID
  stream_id: UUID
  timestamp: string
  viewer_count: number
  engagement_rate: number
  revenue: number
  chat_messages: number
  new_followers: number
  product_clicks: number
}

export type ChatMessageType = "message" | "follow" | "purchase" | "tip"

export interface ChatMessage {
  id: string
  stream_id: string
  user_id?: string | null
  username: string
  message: string
  message_type: ChatMessageType
  amount?: number | null
  created_at: string
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

export interface Order {
  id: string
  user_id?: string | null
  stream_id?: string | null
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  status: OrderStatus
  customer_email?: string | null
  customer_name?: string | null
  shipping_address?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export type AnalyticsDaily = {
  id: UUID
  user_id: UUID
  date: string // yyyy-mm-dd
  total_streams: number
  total_viewers: number
  total_revenue: number
  total_orders: number
  avg_engagement_rate: number
  top_product_id: UUID | null
  created_at: string
}

export type Totals = {
  revenue: number
  viewers: number
  streams: number
  engagement: number
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  gradient: string
  emoji: string
  author: {
    name: string
    avatar: string
    username: string
  }
  publishedAt: string
  readTime: string
  likes: number
  comments: number
  upvotes: number
  tags: string[]
}

export interface Comment {
  id: string
  postId: string
  author: {
    name: string
    avatar: string
    username: string
  }
  content: string
  createdAt: string
  updatedAt?: string
  likes: number
  parentId?: string
  isEdited?: boolean
}

export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar: string
  bio?: string
  followers: number
  following: number
  createdAt: string
}
