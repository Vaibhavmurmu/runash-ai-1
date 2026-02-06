"use client"

import { Users, Edit3, Video, Share2, MessageSquare } from "lucide-react"

export default function ActivityFeed() {
  const activities = [
    {
      id: 1,
      user: "Sarah Chen",
      action: "edited",
      target: "Product Launch Video",
      type: "edit",
      timestamp: "5 minutes ago",
    },
    {
      id: 2,
      user: "You",
      action: "generated",
      target: "AI Intro Sequence",
      type: "video",
      timestamp: "15 minutes ago",
    },
    {
      id: 3,
      user: "Alex Martinez",
      action: "commented on",
      target: "Timeline Discussion",
      type: "comment",
      timestamp: "1 hour ago",
    },
    {
      id: 4,
      user: "Jordan Lee",
      action: "shared",
      target: "Final Export",
      type: "share",
      timestamp: "2 hours ago",
    },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "edit":
        return <Edit3 className="h-5 w-5" />
      case "video":
        return <Video className="h-5 w-5" />
      case "comment":
        return <MessageSquare className="h-5 w-5" />
      case "share":
        return <Share2 className="h-5 w-5" />
      default:
        return <Users className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, idx) => (
        <div key={activity.id} className="flex gap-4 p-4 bg-card border border-border rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1">
            <div>
              <span className="font-semibold">{activity.user}</span>
              <span className="text-muted-foreground"> {activity.action} </span>
              <span className="font-semibold">{activity.target}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">{activity.timestamp}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
