"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { emailAdminApi } from "@/components/email/email-management-api"
import type {
  DeliveryQuery,
  EmailAnalyticsOverview,
  EmailDeliveryRecord,
  EmailSuppressionRecord,
  EmailTemplateRecord,
  SuppressionPayload,
  SuppressionQuery,
  TemplatePayload,
  TemplateQuery,
} from "@/components/email/email-management-types"

const DEFAULT_LIMIT = 10

export function useTemplates() {
  const [query, setQuery] = useState<TemplateQuery>({ limit: DEFAULT_LIMIT, offset: 0, search: "" })
  const [items, setItems] = useState<EmailTemplateRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await emailAdminApi.getTemplates(query)
      setItems(response.data)
      setTotal(response.total)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = useCallback(
    async (payload: TemplatePayload) => {
      setSaving(true)
      try {
        await emailAdminApi.createTemplate(payload)
        await fetchTemplates()
      } finally {
        setSaving(false)
      }
    },
    [fetchTemplates],
  )

  const updateTemplate = useCallback(
    async (id: number, payload: Partial<TemplatePayload>) => {
      setSaving(true)
      try {
        await emailAdminApi.updateTemplate(id, payload)
        await fetchTemplates()
      } finally {
        setSaving(false)
      }
    },
    [fetchTemplates],
  )

  const deleteTemplate = useCallback(
    async (id: number) => {
      setSaving(true)
      try {
        await emailAdminApi.deleteTemplate(id)
        await fetchTemplates()
      } finally {
        setSaving(false)
      }
    },
    [fetchTemplates],
  )

  return {
    query,
    setQuery,
    items,
    total,
    loading,
    saving,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}

export function useDelivery() {
  const [query, setQuery] = useState<DeliveryQuery>({ limit: DEFAULT_LIMIT, offset: 0, recipient_email: "", status: "" })
  const [items, setItems] = useState<EmailDeliveryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDelivery = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await emailAdminApi.getDelivery(query)
      setItems(response.data)
      setTotal(response.total)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load delivery records")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchDelivery()
  }, [fetchDelivery])

  return { query, setQuery, items, total, loading, error, fetchDelivery }
}

export function useSuppressions() {
  const [query, setQuery] = useState<SuppressionQuery>({ limit: DEFAULT_LIMIT, offset: 0, search: "", type: "" })
  const [items, setItems] = useState<EmailSuppressionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppressions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await emailAdminApi.getSuppressions(query)
      setItems(response.data)
      setTotal(response.total)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load suppressions")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchSuppressions()
  }, [fetchSuppressions])

  const createSuppression = useCallback(
    async (payload: SuppressionPayload) => {
      setSaving(true)
      try {
        await emailAdminApi.createSuppression(payload)
        await fetchSuppressions()
      } finally {
        setSaving(false)
      }
    },
    [fetchSuppressions],
  )

  const deleteSuppression = useCallback(
    async (email: string) => {
      setSaving(true)
      try {
        await emailAdminApi.deleteSuppression(email)
        await fetchSuppressions()
      } finally {
        setSaving(false)
      }
    },
    [fetchSuppressions],
  )

  return {
    query,
    setQuery,
    items,
    total,
    loading,
    saving,
    error,
    fetchSuppressions,
    createSuppression,
    deleteSuppression,
  }
}

export function useAnalyticsOverview() {
  const [overview, setOverview] = useState<EmailAnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await emailAdminApi.getAnalytics()
      setOverview(response.data.overview)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  const deliveryRate = useMemo(() => overview?.delivery_rate ?? 0, [overview])

  return { overview, loading, error, deliveryRate, fetchOverview }
}
