"use client"

import { Trash2, Crown, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function CollaboratorsList() {
  const collaborators = [
    {
      id: 1,
      name: "You",
      email: "you@example.com",
      role: "admin",
      avatar: "YU",
      status: "online",
      joined: "Dec 1, 2024",
    },
    {
      id: 2,
      name: "Sarah Chen",
      email: "sarah@example.com",
      role: "editor",
      avatar: "SC",
      status: "online",
      joined: "Dec 3, 2024",
    },
    {
      id: 3,
      name: "Alex Martinez",
      email: "alex@example.com",
      role: "editor",
      avatar: "AM",
      status: "offline",
      joined: "Dec 5, 2024",
    },
    {
      id: 4,
      name: "Jordan Lee",
      email: "jordan@example.com",
      role: "viewer",
      avatar: "JL",
      status: "online",
      joined: "Today",
    },
  ]

  const getRoleIcon = (role: string) => {
    if (role === "admin") return <Crown className="h-4 w-4" />
    return <Shield className="h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {collaborators.map((collaborator) => (
          <div key={collaborator.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {collaborator.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{collaborator.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{collaborator.email}</p>
                </div>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${collaborator.status === "online" ? "bg-green-500" : "bg-gray-500"}`}
              />
            </div>

            <div className="flex items-center justify-between mb-3">
              <Badge
                variant={collaborator.role === "admin" ? "default" : "secondary"}
                className="capitalize flex items-center gap-1"
              >
                {getRoleIcon(collaborator.role)}
                {collaborator.role}
              </Badge>
              <span className="text-xs text-muted-foreground">{collaborator.joined}</span>
            </div>

            {collaborator.role !== "admin" && (
              <button className="w-full px-2 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors flex items-center justify-center gap-1">
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
