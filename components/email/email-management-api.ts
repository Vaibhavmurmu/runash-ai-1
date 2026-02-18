import type {
  ApiItemResponse,
  ApiListResponse,
  DeliveryQuery,
  EmailAnalyticsData,
  EmailDeliveryRecord,
  EmailSuppressionRecord,
  EmailTemplateRecord,
  SuppressionPayload,
  SuppressionQuery,
  TemplatePayload,
  TemplateQuery,
} from "@/components/email/email-management-types"

const toQueryString = (query: Record<string, string | number | boolean | undefined>) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error || "Request failed")
  }

  return body as T
}

export const emailAdminApi = {
  getTemplates: (query: TemplateQuery) => {
    const queryString = toQueryString(query)
    return request<ApiListResponse<EmailTemplateRecord>>(`/api/admin/email-templates?${queryString}`)
  },
  createTemplate: (payload: TemplatePayload) => {
    return request<ApiItemResponse<EmailTemplateRecord>>("/api/admin/email-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
  updateTemplate: (id: number, payload: Partial<TemplatePayload>) => {
    return request<ApiItemResponse<EmailTemplateRecord>>(`/api/admin/email-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
  deleteTemplate: (id: number) => {
    return request<{ success: boolean; message: string }>(`/api/admin/email-templates/${id}`, {
      method: "DELETE",
    })
  },
  getDelivery: (query: DeliveryQuery) => {
    const queryString = toQueryString(query)
    return request<ApiListResponse<EmailDeliveryRecord>>(`/api/admin/email-delivery?${queryString}`)
  },
  getSuppressions: (query: SuppressionQuery) => {
    const queryString = toQueryString(query)
    return request<ApiListResponse<EmailSuppressionRecord>>(`/api/admin/email-suppressions?${queryString}`)
  },
  createSuppression: (payload: SuppressionPayload) => {
    return request<{ success: boolean; message: string }>("/api/admin/email-suppressions", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
  deleteSuppression: (email: string) => {
    const queryString = toQueryString({ email })
    return request<{ success: boolean; message: string }>(`/api/admin/email-suppressions?${queryString}`, {
      method: "DELETE",
    })
  },
  getAnalytics: () => {
    return request<ApiItemResponse<EmailAnalyticsData>>("/api/admin/email-analytics")
  },
}
