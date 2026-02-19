"use client"

import { useAuthSession } from "@/lib/auth/access-client"
import { useEffect, useState } from "react"
import type { UserProfile } from "@/lib/profile-utils"

export function useProfile(username?: string) {
  const { data: session } = useAuthSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true)
        setError(null)

        const endpoint = username ? `/api/profile/${username}` : "/api/profile"
        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        setProfile(data.profile)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (session || username) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [session, username])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      setProfile(data.profile)
      return data.profile
    } catch (err) {
      throw err
    }
  }

  const toggleFollow = async (targetUsername: string) => {
    try {
      const response = await fetch(`/api/profile/${targetUsername}/follow`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to toggle follow")
      }

      const data = await response.json()

      // Update the profile's following status if it's the current profile
      if (profile && profile.username === targetUsername) {
        setProfile({
          ...profile,
          isFollowing: data.isFollowing,
          followerCount: profile.followerCount + (data.isFollowing ? 1 : -1),
        })
      }

      return data
    } catch (err) {
      throw err
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    toggleFollow,
    refetch: () => {
      if (session || username) {
        setLoading(true)
        // Re-trigger the effect
        setProfile(null)
      }
    },
  }
}
