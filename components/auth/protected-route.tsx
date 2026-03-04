"use client"

import type React from "react"

import { useAuthSession } from "@/lib/auth/access-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
  requiredRole?: string
  requireAnyPermission?: boolean
  fallbackUrl?: string
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRole,
  requireAnyPermission = false,
  fallbackUrl = "/login",
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const { data: session, status } = useAuthSession()
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, loading } = usePermissions()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === "loading" || loading) {
      return
    }

    if (!session) {
      router.push(fallbackUrl)
      return
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      setIsAuthorized(false)
      return
    }

    // Check permission requirements
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requireAnyPermission
        ? hasAnyPermission(requiredPermissions)
        : hasAllPermissions(requiredPermissions)

      if (!hasRequiredPermissions) {
        setIsAuthorized(false)
        return
      }
    }

    setIsAuthorized(true)
  }, [
    session,
    status,
    loading,
    requiredPermissions,
    requiredRole,
    requireAnyPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    router,
    fallbackUrl,
  ])

  if (status === "loading" || loading || isAuthorized === null) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    )
  }

  if (!isAuthorized) {
    return (
      unauthorizedComponent || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page. Please contact an administrator if you believe this is an
              error.
            </p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
