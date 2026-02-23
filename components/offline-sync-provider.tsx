"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface OfflineContent {
  id: string
  type: "stream" | "recording" | "product"
  title: string
  size: number
  downloadedAt: number
  expiresAt: number | null
  path: string
  thumbnail: string
  syncStatus: "synced" | "pending" | "failed"
  lastSynced: number | null
}

interface OfflineSyncContextType {
  offlineContent: OfflineContent[]
  isLoading: boolean
  isSyncing: boolean
  storageUsed: number
  storageLimit: number
  downloadContent: (content: Omit<OfflineContent, "downloadedAt" | "syncStatus" | "lastSynced">) => Promise<void>
  removeContent: (id: string) => Promise<void>
  syncContent: (id?: string) => Promise<void>
  setStorageLimit: (limit: number) => void
  isOnline: boolean
  serviceWorkerSupported: boolean
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined)

// Default storage limit: 2GB
const DEFAULT_STORAGE_LIMIT = 2 * 1024 * 1024 * 1024

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [offlineContent, setOfflineContent] = useState<OfflineContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageLimit, setStorageLimit] = useState(DEFAULT_STORAGE_LIMIT)
  const [isOnline, setIsOnline] = useState(true)
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false)
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()

  // Check for Service Worker support
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      // Check if Service Worker is supported
      setServiceWorkerSupported("serviceWorker" in navigator)

      // Set initial online status
      setIsOnline(navigator.onLine)
    }
  }, [])

  // Monitor online status
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "You're back online",
        description: "Your content will sync automatically.",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're offline",
        description: "You can still access your downloaded content.",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  // Load offline content from localStorage on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      const loadOfflineContent = () => {
        setIsLoading(true)

        try {
          // In a real app, this would use IndexedDB or another storage mechanism
          // For demo purposes, we'll use localStorage
          const storedContent = localStorage.getItem(`offlineContent_${user.id}`)
          const storedLimit = localStorage.getItem(`storageLimit_${user.id}`)

          if (storedContent) {
            const parsedContent = JSON.parse(storedContent) as OfflineContent[]
            setOfflineContent(parsedContent)

            // Calculate storage used
            const used = parsedContent.reduce((total, item) => total + item.size, 0)
            setStorageUsed(used)
          } else {
            // Demo data for new users
            const demoContent: OfflineContent[] = [
              {
                id: "rec-1",
                type: "recording",
                title: "Tech Showcase 2025",
                size: 250 * 1024 * 1024, // 250MB
                downloadedAt: Date.now() - 86400000, // 1 day ago
                expiresAt: Date.now() + 2592000000, // 30 days from now
                path: "/downloads/offline/tech-showcase-2025",
                thumbnail: "/placeholder.svg?height=120&width=200",
                syncStatus: "synced",
                lastSynced: Date.now() - 3600000, // 1 hour ago
              },
              {
                id: "rec-2",
                type: "recording",
                title: "Smart Home Essentials",
                size: 180 * 1024 * 1024, // 180MB
                downloadedAt: Date.now() - 172800000, // 2 days ago
                expiresAt: Date.now() + 2592000000, // 30 days from now
                path: "/downloads/offline/smart-home-essentials",
                thumbnail: "/placeholder.svg?height=120&width=200",
                syncStatus: "synced",
                lastSynced: Date.now() - 7200000, // 2 hours ago
              },
            ]

            setOfflineContent(demoContent)

            // Calculate storage used
            const used = demoContent.reduce((total, item) => total + item.size, 0)
            setStorageUsed(used)

            // Save to localStorage
            localStorage.setItem(`offlineContent_${user.id}`, JSON.stringify(demoContent))
          }

          // Set storage limit
          if (storedLimit) {
            setStorageLimit(Number.parseInt(storedLimit, 10))
          } else {
            localStorage.setItem(`storageLimit_${user.id}`, DEFAULT_STORAGE_LIMIT.toString())
          }
        } catch (error) {
          console.error("Error loading offline content:", error)
          // Fallback to empty content
          setOfflineContent([])
          setStorageUsed(0)
        } finally {
          setIsLoading(false)
        }
      }

      loadOfflineContent()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  // Save offline content to localStorage whenever it changes
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      try {
        localStorage.setItem(`offlineContent_${user.id}`, JSON.stringify(offlineContent))

        // Calculate storage used
        const used = offlineContent.reduce((total, item) => total + item.size, 0)
        setStorageUsed(used)
      } catch (error) {
        console.error("Error saving offline content:", error)
      }
    }
  }, [offlineContent, isAuthenticated, user, isLoading])

  // Download content
  const downloadContent = async (content: Omit<OfflineContent, "downloadedAt" | "syncStatus" | "lastSynced">) => {
    // Check if we have enough storage
    if (storageUsed + content.size > storageLimit) {
      toast({
        title: "Not enough storage",
        description: "Please free up space by removing other downloads or increase your storage limit.",
        variant: "destructive",
      })
      return Promise.reject(new Error("Not enough storage"))
    }

    // Check if content already exists
    if (offlineContent.some((item) => item.id === content.id)) {
      toast({
        title: "Already downloaded",
        description: `${content.title} is already in your downloads.`,
      })
      return Promise.resolve()
    }

    // Simulate download
    toast({
      title: "Download started",
      description: `Downloading ${content.title}...`,
    })

    try {
      // In a real app, this would actually download the content
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const newContent: OfflineContent = {
        ...content,
        downloadedAt: Date.now(),
        syncStatus: "synced",
        lastSynced: Date.now(),
      }

      setOfflineContent((prev) => [...prev, newContent])

      toast({
        title: "Download complete",
        description: `${content.title} has been downloaded for offline viewing.`,
      })

      return Promise.resolve()
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "There was an error downloading the content. Please try again.",
        variant: "destructive",
      })
      return Promise.reject(error)
    }
  }

  // Remove content
  const removeContent = async (id: string) => {
    const contentToRemove = offlineContent.find((item) => item.id === id)

    if (!contentToRemove) {
      return Promise.resolve()
    }

    // In a real app, this would delete the actual file
    toast({
      title: "Removing download",
      description: `Removing ${contentToRemove.title}...`,
    })

    try {
      // Simulate removal delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setOfflineContent((prev) => prev.filter((item) => item.id !== id))

      toast({
        title: "Download removed",
        description: `${contentToRemove.title} has been removed from your downloads.`,
      })

      return Promise.resolve()
    } catch (error) {
      console.error("Removal error:", error)
      toast({
        title: "Removal failed",
        description: "There was an error removing the content. Please try again.",
        variant: "destructive",
      })
      return Promise.reject(error)
    }
  }

  // Sync content
  const syncContent = async (id?: string) => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync content while offline. Please check your connection.",
        variant: "destructive",
      })
      return Promise.reject(new Error("Offline"))
    }

    setIsSyncing(true)

    try {
      if (id) {
        // Sync specific content
        const contentToSync = offlineContent.find((item) => item.id === id)

        if (!contentToSync) {
          throw new Error("Content not found")
        }

        toast({
          title: "Syncing",
          description: `Syncing ${contentToSync.title}...`,
        })

        // Simulate sync delay
        await new Promise((resolve) => setTimeout(resolve, 1500))

        setOfflineContent((prev) =>
          prev.map((item) => (item.id === id ? { ...item, syncStatus: "synced", lastSynced: Date.now() } : item)),
        )

        toast({
          title: "Sync complete",
          description: `${contentToSync.title} has been synced.`,
        })
      } else {
        // Sync all content
        toast({
          title: "Syncing",
          description: "Syncing all content...",
        })

        // Simulate sync delay
        await new Promise((resolve) => setTimeout(resolve, 2000))

        setOfflineContent((prev) => prev.map((item) => ({ ...item, syncStatus: "synced", lastSynced: Date.now() })))

        toast({
          title: "Sync complete",
          description: "All content has been synced.",
        })
      }

      return Promise.resolve()
    } catch (error) {
      console.error("Sync error:", error)
      toast({
        title: "Sync failed",
        description: "There was an error syncing your content. Please try again.",
        variant: "destructive",
      })
      return Promise.reject(error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Update storage limit
  const updateStorageLimit = (limit: number) => {
    if (isAuthenticated && user) {
      try {
        setStorageLimit(limit)
        localStorage.setItem(`storageLimit_${user.id}`, limit.toString())

        toast({
          title: "Storage limit updated",
          description: `Your storage limit has been set to ${(limit / (1024 * 1024 * 1024)).toFixed(1)} GB.`,
        })
      } catch (error) {
        console.error("Error updating storage limit:", error)
        toast({
          title: "Update failed",
          description: "There was an error updating your storage limit.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <OfflineSyncContext.Provider
      value={{
        offlineContent,
        isLoading,
        isSyncing,
        storageUsed,
        storageLimit,
        downloadContent,
        removeContent,
        syncContent,
        setStorageLimit: updateStorageLimit,
        isOnline,
        serviceWorkerSupported,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  )
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext)
  if (context === undefined) {
    throw new Error("useOfflineSync must be used within an OfflineSyncProvider")
  }
  return context
}
