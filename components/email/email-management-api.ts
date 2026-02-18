import type {
  ApiItemResponse,
  ApiListResponse,
  BroadcastPayload,
  BroadcastQuery,
  ContactPayload,
  ContactQuery,
  DeliveryQuery,
  EmailAnalyticsData,
  EmailAnalyticsQuery,
  EmailBroadcastRecord,
  EmailBroadcastTemplateOption,
  EmailContactImportSummary,
  EmailContactRecord,
  EmailDeliveryRecord,
  EmailSuppressionRecord,
  EmailTemplateRecord,
  EmailWebhookRecord,
  SuppressionPayload,
  SuppressionQuery,
  TemplatePayload,
  TemplateQuery,
  WebhookQuery,
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

  getBroadcasts: (query: BroadcastQuery) => {
    const queryString = toQueryString(query)
    return request<ApiListResponse<EmailBroadcastRecord> & { templates: EmailBroadcastTemplateOption[] }>(`/api/admin/email-broadcasts?${queryString}`)
  },
  createBroadcast: (payload: BroadcastPayload) => {
    return request<ApiItemResponse<EmailBroadcastRecord>>("/api/admin/email-broadcasts", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
  updateBroadcast: (id: number, payload: Partial<BroadcastPayload> & { status?: string }) => {
    return request<ApiItemResponse<EmailBroadcastRecord>>(`/api/admin/email-broadcasts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
  sendBroadcastTest: (id: number, recipient_email: string) => {
    return request<{ success: boolean; data: { success: boolean; message: string } }>(`/api/admin/email-broadcasts/${id}/test-send`, {
      method: "POST",
      body: JSON.stringify({ recipient_email }),
    })
  },
  sendBroadcast: (id: number) => {
    return request<{ success: boolean; data: { sent: number; failed: number; total: number } }>(`/api/admin/email-broadcasts/${id}/send`, {
      method: "POST",
    })
  },
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
  getContacts: (query: ContactQuery) => {
    const queryString = toQueryString(query)
    return request<ApiListResponse<EmailContactRecord>>(`/api/admin/email-contacts?${queryString}`)
  },
  createContact: (payload: ContactPayload) => {
    return request<ApiItemResponse<EmailContactRecord>>("/api/admin/email-contacts", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
  updateContact: (id: number, payload: Partial<ContactPayload>) => {
    return request<ApiItemResponse<EmailContactRecord>>(`/api/admin/email-contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },
  deleteContact: (id: number) => {
    return request<{ success: boolean; message: string }>(`/api/admin/email-contacts/${id}`, {
      method: "DELETE",
    })
  },
  importContacts: async (payload: {
    file: File
    source?: string
    defaultStatus?: string
    updateExisting?: boolean
  }) => {
    const formData = new FormData()
    formData.set("file", payload.file)
    if (payload.source) formData.set("source", payload.source)
    if (payload.defaultStatus) formData.set("defaultStatus", payload.defaultStatus)
    if (payload.updateExisting) formData.set("updateExisting", "true")

    const response = await fetch("/api/admin/email-contacts/import", {
      method: "POST",
      body: formData,
    })

    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body.error || "Import failed")
    }

    return body as {
      success: boolean
      data: {
        summary: EmailContactImportSummary
      }
    }
  },
  getAnalytics: (query: EmailAnalyticsQuery = {}) => {
    const queryString = toQueryString(query)
    return request<ApiItemResponse<EmailAnalyticsData>>(`/api/admin/email-analytics${queryString ? `?${queryString}` : ""}`)
  },
  getWebhooks: (query: WebhookQuery) => {
    const queryString = toQueryString(query)
    return request<ApiListResponse<EmailWebhookRecord>>(`/api/admin/email-webhooks?${queryString}`)
  },
}
