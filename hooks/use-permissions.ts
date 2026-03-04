"use client"

import { useAuthSession } from "@/lib/auth/access-client"
import { useEffect, useState } from "react"

export function usePermissions() {
  const { data: session } = useAuthSession()
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPermissions() {
      if (!session?.user?.id) {
        setPermissions([])
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/auth/permissions")
        if (response.ok) {
          const data = await response.json()
          setPermissions(data.permissions || [])
        }
      } catch (error) {
        console.error("Error fetching permissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [session?.user?.id])

  const hasPermission = (permission: string) => permissions.includes(permission)

  const hasAnyPermission = (requiredPermissions: string[]) =>
    requiredPermissions.some((permission) => permissions.includes(permission))

  const hasAllPermissions = (requiredPermissions: string[]) =>
    requiredPermissions.every((permission) => permissions.includes(permission))

  const hasRole = (role: string) => session?.user?.role === role

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    user: session?.user,
  }
}
