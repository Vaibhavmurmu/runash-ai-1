"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuthSession } from "@/lib/auth/access-client"
import type { AIAgent, CreateAIAgentInput, UpdateAIAgentInput } from "@/lib/repositories/ai-agents"

export type { AIAgent, CreateAIAgentInput, UpdateAIAgentInput }

const AUTH_REQUIRED_ERROR = "Please sign in to manage your AI agents."

export function useAIAgents() {
  const { data: session, status } = useAuthSession()
  const userId = session?.user?.id
  const isAuthenticated = Boolean(userId)

  const [agents, setAgents] = useState<AIAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    if (!isAuthenticated) {
      setAgents([])
      setError(AUTH_REQUIRED_ERROR)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/ai-agents")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAgents(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (status === "loading") {
      setLoading(true)
      return
    }

    void fetchAgents()
  }, [fetchAgents, status])

  const createAgent = async (agentData: CreateAIAgentInput) => {
    if (!isAuthenticated) {
      return { data: null, error: AUTH_REQUIRED_ERROR }
    }

    try {
      const res = await fetch("/api/ai-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentData),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setError(null)
      setAgents((prev) => [json.data, ...prev])
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const updateAgent = async (id: string, updates: UpdateAIAgentInput) => {
    if (!isAuthenticated) {
      return { data: null, error: AUTH_REQUIRED_ERROR }
    }

    const existingAgent = agents.find((agent) => agent.id === id)
    if (existingAgent && existingAgent.user_id !== userId) {
      return { data: null, error: "You do not have access to update this agent." }
    }

    try {
      const res = await fetch(`/api/ai-agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setError(null)
      setAgents((prev) => prev.map((a) => (a.id === id ? json.data : a)))
      return { data: json.data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : "An error occurred" }
    }
  }

  const deleteAgent = async (id: string) => {
    if (!isAuthenticated) {
      return { error: AUTH_REQUIRED_ERROR }
    }

    const existingAgent = agents.find((agent) => agent.id === id)
    if (existingAgent && existingAgent.user_id !== userId) {
      return { error: "You do not have access to delete this agent." }
    }

    try {
      const res = await fetch(`/api/ai-agents/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setError(null)
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
    isAuthenticated,
    isAuthLoading: status === "loading",
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    refetch: fetchAgents,
  }
}
