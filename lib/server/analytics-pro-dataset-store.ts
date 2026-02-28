import type { AnalyticsDataset } from "@/lib/analytics-pro"

const seed: AnalyticsDataset[] = [
  {
    id: "audience-retention",
    name: "Audience Retention",
    description: "Minute-level retention, churn, and language preference cohorts.",
    source: "audience",
    records: 18420,
    tags: ["retention", "cohorts", "hindi-english"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "live-chat-signals",
    name: "Live Chat Signals",
    description: "Chat velocity, sentiment and assistant notification confidence.",
    source: "chat",
    records: 9310,
    tags: ["chat", "assistant", "notifications"],
    updatedAt: new Date().toISOString(),
  },
]

type DatasetState = Map<string, AnalyticsDataset[]>

function getState() {
  const globalAny = globalThis as typeof globalThis & { __runashAnalyticsDatasetState?: DatasetState }
  if (!globalAny.__runashAnalyticsDatasetState) {
    globalAny.__runashAnalyticsDatasetState = new Map<string, AnalyticsDataset[]>()
  }
  return globalAny.__runashAnalyticsDatasetState
}

export function listDatasets(userId: string) {
  const state = getState()
  if (!state.has(userId)) state.set(userId, structuredClone(seed))
  return state.get(userId) ?? []
}

export function createDataset(userId: string, partial: Omit<AnalyticsDataset, "id" | "updatedAt">) {
  const datasets = listDatasets(userId)
  const created: AnalyticsDataset = {
    ...partial,
    id: `ds-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  }
  datasets.unshift(created)
  return created
}

export function updateDataset(userId: string, id: string, updates: Partial<Omit<AnalyticsDataset, "id">>) {
  const datasets = listDatasets(userId)
  const index = datasets.findIndex((dataset) => dataset.id === id)
  if (index === -1) return null
  const updated: AnalyticsDataset = {
    ...datasets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  datasets[index] = updated
  return updated
}

export function removeDataset(userId: string, id: string) {
  const datasets = listDatasets(userId)
  const index = datasets.findIndex((dataset) => dataset.id === id)
  if (index === -1) return false
  datasets.splice(index, 1)
  return true
}
