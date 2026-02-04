// Simple in-memory data store for preview/demo environments.
// Not suitable for production. State resets on reload.

import type { AIAgent, AnalyticsDaily, Product, Stream, StreamMetric } from "@/lib/types"

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

const nowISO = () => new Date().toISOString()
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// Seed a single local user for demo purposes
export const LOCAL_USER_ID = "local-user-1"

export const profiles = [
  {
    id: LOCAL_USER_ID,
    email: "ram@runash.ai",
    full_name: "Ram Murmu",
    subscription_tier: "pro",
    avatar_url: "/placeholder-user.jpg",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
]

// Products
export const products: Product[] = [
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "Organic Vitamin C Serum",
    description: "Premium vitamin C serum for radiant skin",
    price: 49.99,
    category: "Skincare",
    image_url: null,
    in_stock: true,
    featured: true,
    sales_count: 234,
    inventory_count: 150,
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "Natural Face Moisturizer",
    description: "Hydrating moisturizer with organic ingredients",
    price: 34.99,
    category: "Skincare",
    image_url: null,
    in_stock: true,
    featured: false,
    sales_count: 189,
    inventory_count: 200,
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "Organic Cleanser",
    description: "Gentle daily cleanser for all skin types",
    price: 24.99,
    category: "Skincare",
    image_url: null,
    in_stock: false,
    featured: false,
    sales_count: 156,
    inventory_count: 0,
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "Anti-Aging Night Cream",
    description: "Advanced anti-aging formula for overnight repair",
    price: 59.99,
    category: "Skincare",
    image_url: null,
    in_stock: true,
    featured: true,
    sales_count: 312,
    inventory_count: 75,
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "Wellness Supplement Pack",
    description: "Complete daily wellness vitamins",
    price: 39.99,
    category: "Wellness",
    image_url: null,
    in_stock: true,
    featured: false,
    sales_count: 145,
    inventory_count: 300,
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "Protein Powder",
    description: "Organic plant-based protein powder",
    price: 29.99,
    category: "Nutrition",
    image_url: null,
    in_stock: true,
    featured: false,
    sales_count: 267,
    inventory_count: 180,
    created_at: nowISO(),
    updated_at: nowISO(),
  },
]

// Streams
export const streams: Stream[] = [
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    title: "Organic Skincare Live Show",
    description: "Join us for an exclusive look at our latest organic skincare products!",
    category: "Skincare",
    status: "live",
    stream_key: null,
    rtmp_url: null,
    thumbnail_url: null,
    scheduled_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actual_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actual_end: null,
    max_viewers: 2847,
    total_revenue: 1234.5,
    ai_agent_id: null,
    settings: {},
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    title: "Wellness Wednesday Special",
    description: "Weekly wellness tips and product showcase",
    category: "Wellness",
    status: "scheduled",
    stream_key: null,
    rtmp_url: null,
    thumbnail_url: null,
    scheduled_start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    actual_start: null,
    actual_end: null,
    max_viewers: 0,
    total_revenue: 0,
    ai_agent_id: null,
    settings: {},
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    title: "Product Launch Event",
    description: "Launching our new anti-aging line",
    category: "Launch",
    status: "ended",
    stream_key: null,
    rtmp_url: null,
    thumbnail_url: null,
    scheduled_start: daysAgo(1).toISOString(),
    actual_start: daysAgo(1).toISOString(),
    actual_end: daysAgo(1).toISOString(),
    max_viewers: 1654,
    total_revenue: 2156.75,
    ai_agent_id: null,
    settings: {},
    created_at: nowISO(),
    updated_at: nowISO(),
  },
]

// Stream metrics (last 7 days for first stream)
export const streamMetrics: StreamMetric[] = Array.from({ length: 7 }).map((_, i) => ({
  id: uid(),
  stream_id: streams[0].id,
  timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString(),
  viewer_count: Math.floor(1500 + Math.random() * 1500),
  engagement_rate: Math.round((70 + Math.random() * 30) * 10) / 10,
  revenue: Math.round((500 + Math.random() * 1500) * 100) / 100,
  chat_messages: Math.floor(50 + Math.random() * 200),
  new_followers: Math.floor(10 + Math.random() * 50),
  product_clicks: Math.floor(20 + Math.random() * 100),
}))

// Agents
export const aiAgents: AIAgent[] = [
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "SalesBot Pro",
    type: "sales",
    status: "active",
    performance_score: 94,
    tasks_completed: 127,
    current_task: "Responding to product inquiries",
    enabled: true,
    settings: { responseStyle: "helpful", knowledgeBase: "products", automationLevel: "medium" },
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    id: uid(),
    user_id: LOCAL_USER_ID,
    name: "EngageBot",
    type: "engagement",
    status: "active",
    performance_score: 87,
    tasks_completed: 89,
    current_task: "Moderating chat messages",
    enabled: true,
    settings: { responseStyle: "friendly", knowledgeBase: "faq", automationLevel: "medium" },
    created_at: nowISO(),
    updated_at: nowISO(),
  },
]

// Analytics daily (last 7 days)
export const analyticsDaily: AnalyticsDaily[] = Array.from({ length: 7 }).map((_, i) => {
  const d = daysAgo(7 - i)
  const date = d.toISOString().split("T")[0]
  const total_streams = Math.floor(1 + Math.random() * 3)
  const total_viewers = Math.floor(1500 + Math.random() * 3000)
  const total_revenue = Math.round((800 + Math.random() * 1800) * 100) / 100
  const total_orders = Math.floor(20 + Math.random() * 60)
  const avg_engagement_rate = Math.round((75 + Math.random() * 20) * 10) / 10

  return {
    id: uid(),
    user_id: LOCAL_USER_ID,
    date,
    total_streams,
    total_viewers,
    total_revenue,
    total_orders,
    avg_engagement_rate,
    top_product_id: products[0]?.id ?? null,
    created_at: nowISO(),
  }
})

// Simple CRUD helpers

// Products
export function getProducts(userId: string, opts?: { category?: string; search?: string }) {
  let list = products.filter((p) => p.user_id === userId)
  if (opts?.category && opts.category !== "all") list = list.filter((p) => p.category === opts.category)
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q))
  }
  return list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}
export function createProduct(userId: string, input: Partial<Product>) {
  const item: Product = {
    id: uid(),
    user_id: userId,
    name: input.name || "Untitled",
    description: input.description ?? null,
    price: typeof input.price === "number" ? input.price : 0,
    category: input.category || "General",
    image_url: input.image_url ?? null,
    in_stock: input.in_stock ?? true,
    featured: input.featured ?? false,
    sales_count: input.sales_count ?? 0,
    inventory_count: input.inventory_count ?? 0,
    created_at: nowISO(),
    updated_at: nowISO(),
  }
  products.unshift(item)
  return item
}
export function updateProduct(id: string, updates: Partial<Product>) {
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  products[idx] = { ...products[idx], ...updates, updated_at: nowISO() }
  return products[idx]
}
export function deleteProduct(id: string) {
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return false
  products.splice(idx, 1)
  return true
}

// Streams
export function getStreams(userId: string) {
  return streams.filter((s) => s.user_id === userId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}
export function getStream(id: string) {
  return streams.find((s) => s.id === id) || null
}
export function createStream(userId: string, input: Partial<Stream>) {
  const item: Stream = {
    id: uid(),
    user_id: userId,
    title: input.title || "Untitled Stream",
    description: input.description ?? null,
    category: input.category || "General",
    status: input.status || "scheduled",
    stream_key: null,
    rtmp_url: null,
    thumbnail_url: null,
    scheduled_start: input.scheduled_start ?? nowISO(),
    actual_start: input.actual_start ?? null,
    actual_end: input.actual_end ?? null,
    max_viewers: input.max_viewers ?? 0,
    total_revenue: input.total_revenue ?? 0,
    ai_agent_id: input.ai_agent_id ?? null,
    settings: input.settings ?? {},
    created_at: nowISO(),
    updated_at: nowISO(),
  }
  streams.unshift(item)
  return item
}
export function updateStream(id: string, updates: Partial<Stream>) {
  const idx = streams.findIndex((s) => s.id === id)
  if (idx === -1) return null
  streams[idx] = { ...streams[idx], ...updates, updated_at: nowISO() }
  return streams[idx]
}
export function deleteStream(id: string) {
  const idx = streams.findIndex((s) => s.id === id)
  if (idx === -1) return false
  streams.splice(idx, 1)
  return true
}
export function getStreamMetricsForUser(userId: string) {
  const userStreamIds = streams.filter((s) => s.user_id === userId).map((s) => s.id)
  return streamMetrics
    .filter((m) => userStreamIds.includes(m.stream_id))
    .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
}

// Analytics
export function getAnalytics(userId: string, days: number) {
  const start = new Date()
  start.setDate(start.getDate() - days)
  const daily = analyticsDaily
    .filter((a) => a.user_id === userId && new Date(a.date) >= start)
    .sort((a, b) => (a.date > b.date ? 1 : -1))

  const totals = {
    revenue: daily.reduce((sum, d) => sum + (d.total_revenue || 0), 0),
    viewers: daily.reduce((sum, d) => sum + (d.total_viewers || 0), 0),
    streams: daily.reduce((sum, d) => sum + (d.total_streams || 0), 0),
    engagement: daily.length ? daily.reduce((s, d) => s + (d.avg_engagement_rate || 0), 0) / daily.length : 0,
  }

  return { dailyAnalytics: daily, totals }
  }
