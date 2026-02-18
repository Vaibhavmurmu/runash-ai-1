export interface ApiPagination {
  limit: number
  offset: number
  hasMore: boolean
}

export interface ApiListResponse<T> {
  success: boolean
  data: T[]
  total: number
  pagination: ApiPagination
}

export interface ApiItemResponse<T> {
  success: boolean
  data: T
}

export interface EmailTemplateRecord {
  id: number
  name: string
  subject: string
  html_content: string
  text_content?: string | null
  category: string
  description?: string | null
  variables: Array<{ name: string; description: string }>
  is_active: boolean
  is_system: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface EmailDeliveryRecord {
  id: number
  campaign_id?: number | null
  template_id?: number | null
  recipient_email: string
  subject: string
  status: string
  sent_at?: string | null
  delivered_at?: string | null
  opened_at?: string | null
  clicked_at?: string | null
  bounced_at?: string | null
  bounce_reason?: string | null
  created_at: string
}

export interface EmailSuppressionRecord {
  id: number
  email: string
  type: string
  reason?: string | null
  is_permanent: boolean
  created_at: string
  updated_at: string
}

export interface EmailContactRecord {
  id: number
  email: string
  name?: string | null
  status: "subscribed" | "unsubscribed" | "bounced" | "suppressed"
  metadata: Record<string, unknown>
  source?: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface EmailContactImportSummary {
  total_rows: number
  created_count: number
  updated_count: number
  duplicate_count: number
  invalid_count: number
  errors: string[]
}

export interface EmailAnalyticsOverview {
  total_sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  unsubscribe_rate: number
}

export interface EmailAnalyticsData {
  overview: EmailAnalyticsOverview
}

export interface TemplateQuery {
  search?: string
  category?: string
  is_active?: boolean
  limit: number
  offset: number
}

export interface DeliveryQuery {
  status?: string
  recipient_email?: string
  limit: number
  offset: number
}

export interface SuppressionQuery {
  type?: string
  search?: string
  is_permanent?: boolean
  limit: number
  offset: number
}

export interface ContactQuery {
  status?: string
  tags?: string
  search?: string
  limit: number
  offset: number
}

export interface TemplatePayload {
  name: string
  subject: string
  html_content: string
  text_content?: string
  category?: string
  description?: string
}

export interface SuppressionPayload {
  email: string
  type: string
  reason?: string
}

export interface ContactPayload {
  email: string
  name?: string
  status?: EmailContactRecord["status"]
  metadata?: Record<string, unknown>
  source?: string
  tags?: string[]
}
