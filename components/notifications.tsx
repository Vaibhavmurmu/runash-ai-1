"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications, type Notification } from "@/components/notifications-provider"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications()

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    setOpen(false)
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "system":
        return "🔔"
      case "order":
        return "📦"
      case "stream":
        return "🎥"
      case "product":
        return "🛍️"
      case "social":
        return "👥"
      case "promotion":
        return "🏷️"
      default:
        return "📣"
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-xs font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-medium">Notifications</h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        {notifications.length > 0 ? (
          <>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1 p-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-md p-3 transition-colors hover:bg-accent",
                      !notification.read && "bg-accent/50",
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0">
                      {notification.image ? (
                        <div className="h-10 w-10 overflow-hidden rounded-md">
                          <Image
                            src={notification.image || "/placeholder.svg"}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-100 text-lg text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-none">{notification.title}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            clearNotification(notification.id)
                          }}
                        >
                          <span className="sr-only">Dismiss</span>×
                        </Button>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full justify-center" asChild>
                <Link href="/notifications">View all notifications</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="mb-1 text-sm font-medium">No notifications</h4>
            <p className="text-xs text-muted-foreground">
              You're all caught up! We'll notify you when something new arrives.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
