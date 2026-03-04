"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"

export interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error" | "promo"
  title: string
  message: string
  timestamp: number
  read: boolean
  link?: string
  image?: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { isAuthenticated, user } = useAuth()

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      try {
        const storedNotifications = localStorage.getItem(`notifications_${user.id}`)

        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications))
        } else {
          // Demo notifications for new users
          const demoNotifications: Notification[] = [
            {
              id: "notif-1",
              type: "info",
              title: "Welcome to RunAsh!",
              message: "Thanks for joining our platform. Explore live streams and discover amazing products.",
              timestamp: Date.now() - 3600000, // 1 hour ago
              read: false,
            },
            {
              id: "notif-2",
              type: "promo",
              title: "Flash Sale: Tech Gadgets",
              message: "Don't miss our flash sale on the latest tech gadgets. Up to 50% off!",
              timestamp: Date.now() - 86400000, // 1 day ago
              read: true,
              link: "/products?category=tech&sale=true",
              image: "/placeholder.svg?height=80&width=120",
            },
            {
              id: "notif-3",
              type: "success",
              title: "Account Verified",
              message: "Your account has been successfully verified. Enjoy all features of RunAsh!",
              timestamp: Date.now() - 172800000, // 2 days ago
              read: true,
            },
          ]

          setNotifications(demoNotifications)
          localStorage.setItem(`notifications_${user.id}`, JSON.stringify(demoNotifications))
        }
      } catch (error) {
        console.error("Error loading notifications:", error)
        // Fallback to empty notifications
        setNotifications([])
      }
    }
  }, [isAuthenticated, user])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (isAuthenticated && user) {
      try {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications))
      } catch (error) {
        console.error("Error saving notifications:", error)
      }
    }
  }, [notifications, isAuthenticated, user])

  // Calculate unread count
  const unreadCount = notifications.filter((notification) => !notification.read).length

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([])
  }

  // Add a new notification
  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    }

    setNotifications((prev) => [newNotification, ...prev])
  }

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
        addNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}
