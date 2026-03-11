"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, UserMinus, Shield } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import type { StreamingPlatform } from "@/types/platform-chat"
import { getPlatformIcon } from "./platform-utils"
import { useToast } from "@/components/ui/use-toast"
import { useChatParticipants } from "@/hooks/use-chat-participants"

interface ChatUser {
  id: string
  username: string
  platform: StreamingPlatform
  isModerator: boolean
  isSubscriber: boolean
  isVIP: boolean
}

interface PlatformChatUsersProps {
  platform?: StreamingPlatform
}

export default function PlatformChatUsers({ platform }: PlatformChatUsersProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const { data: users, loading: isLoading, error, moderate } = useChatParticipants("studio-default", platform)

  const filteredUsers = searchQuery
    ? users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : users

  const moderators = filteredUsers.filter((user) => user.isModerator)
  const vips = filteredUsers.filter((user) => user.isVIP && !user.isModerator)
  const subscribers = filteredUsers.filter((user) => user.isSubscriber && !user.isModerator && !user.isVIP)
  const viewers = filteredUsers.filter((user) => !user.isSubscriber && !user.isModerator && !user.isVIP)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>
  }

  if (filteredUsers.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No participants found.</div>
  }

  const handleModeration = async (user: ChatUser, action: "make_moderator" | "make_vip" | "timeout") => {
    try {
      await moderate(user.id, action)
      toast({ title: "Moderation updated", description: `${user.username} has been updated.` })
    } catch (actionError) {
      toast({
        title: "Moderation failed",
        description: actionError instanceof Error ? actionError.message : "Unable to update participant",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="h-full flex flex-col p-3">
      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{filteredUsers.length} users in chat</div>

      <ScrollArea className="flex-1">
        {moderators.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium mb-1 flex items-center">
              <Shield className="h-3 w-3 mr-1 text-green-500" />
              Moderators
            </h4>
            <div className="space-y-1">
              {moderators.map((user) => (
                <UserItem key={user.id} user={user} onModerate={handleModeration} />
              ))}
            </div>
          </div>
        )}

        {vips.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium mb-1">VIPs</h4>
            <div className="space-y-1">
              {vips.map((user) => (
                <UserItem key={user.id} user={user} onModerate={handleModeration} />
              ))}
            </div>
          </div>
        )}

        {subscribers.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium mb-1">Subscribers</h4>
            <div className="space-y-1">
              {subscribers.map((user) => (
                <UserItem key={user.id} user={user} onModerate={handleModeration} />
              ))}
            </div>
          </div>
        )}

        {viewers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium mb-1">Viewers</h4>
            <div className="space-y-1">
              {viewers.map((user) => (
                <UserItem key={user.id} user={user} onModerate={handleModeration} />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function UserItem({ user, onModerate }: { user: ChatUser; onModerate: (user: ChatUser, action: "make_moderator" | "make_vip" | "timeout") => void }) {
  const PlatformIcon = getPlatformIcon(user.platform)

  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center">
        <PlatformIcon className="h-3 w-3 mr-1 text-gray-400" />
        <span className="text-sm">{user.username}</span>
        {user.isModerator && (
          <Badge
            variant="outline"
            className="ml-1 text-[10px] py-0 h-4 border-green-500 text-green-700 dark:text-green-400"
          >
            Mod
          </Badge>
        )}
        {user.isVIP && (
          <Badge
            variant="outline"
            className="ml-1 text-[10px] py-0 h-4 border-purple-500 text-purple-700 dark:text-purple-400"
          >
            VIP
          </Badge>
        )}
        {user.isSubscriber && !user.isVIP && !user.isModerator && (
          <Badge
            variant="outline"
            className="ml-1 text-[10px] py-0 h-4 border-blue-500 text-blue-700 dark:text-blue-400"
          >
            Sub
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onModerate(user, "make_moderator")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Make Moderator
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModerate(user, "make_vip")}>
            <Shield className="h-4 w-4 mr-2" />
            Make VIP
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={() => onModerate(user, "timeout")}>
            <UserMinus className="h-4 w-4 mr-2" />
            Timeout User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
