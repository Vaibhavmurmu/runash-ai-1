import type { AnalyticsDataset, StudioConsentPayload, StudioRecordingPayload } from "@/lib/analytics-pro"

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? "Request failed")
  }
  return response.json() as Promise<T>
}

export async function listAnalyticsDatasets() {
  const response = await fetch("/api/analytics/pro-datasets", { cache: "no-store" })
  return readJson<{ datasets: AnalyticsDataset[] }>(response)
}

export async function createAnalyticsDataset(payload: Omit<AnalyticsDataset, "id" | "updatedAt">) {
  const response = await fetch("/api/analytics/pro-datasets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return readJson<{ dataset: AnalyticsDataset }>(response)
}

export async function deleteAnalyticsDataset(id: string) {
  const response = await fetch(`/api/analytics/pro-datasets/${id}`, { method: "DELETE" })
  return readJson<{ success: boolean }>(response)
}

export async function saveStudioConsent(streamId: string, payload: StudioConsentPayload) {
  const response = await fetch(`/api/streams/sessions/${streamId}/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return readJson<{ consent: StudioConsentPayload }>(response)
}

export async function createStudioRecording(streamId: string, payload: StudioRecordingPayload) {
  const response = await fetch(`/api/streams/sessions/${streamId}/recordings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return readJson<{ recording: { id: string; storage: "cloud" | "local"; transcriptStatus: string; file_url: string } }>(response)
}
