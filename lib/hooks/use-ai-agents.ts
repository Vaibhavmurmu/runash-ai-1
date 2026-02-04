"use client"

import { useEffect, useState } from "react"
import type { AIAgent } from "@/lib/repositories/ai-agents"

export type { AIAgent }

export function useAIAgents(userId?: string) {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchAgents()
    }
  }, [userId])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/ai-agents?userId=${userId}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAgents(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createAgent = async (agentData: Partial<AIAgent>) => {
    try {
      const res = await fetch("/api/ai-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...agentData, user_id: userId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAgents((prev) => [json.data, ...prev])
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const updateAgent = async (id: string, updates: Partial<AIAgent>) => {
    try {
      const res = await fetch(`/api/ai-agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, user_id: userId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAgents((prev) => prev.map((a) => (a.id === id ? json.data : a)))
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const deleteAgent = async (id: string) => {
    try {
      const res = await fetch(`/api/ai-agents/${id}?userId=${userId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAgents((prev) => prev.filter((a) => a.id !== id))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const toggleAgentStatus = async (id: string, enabled: boolean) => {
    return updateAgent(id, {
      enabled,
      status: enabled ? "active" : "disabled",
    })
  }

  return {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    refetch: fetchAgents,
  }
}
