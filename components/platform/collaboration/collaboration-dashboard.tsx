"use client"

import { useState } from "react"
import { Users, Plus, X, Activity, Settings, Copy } from "lucide-react"
import CollaboratorsList from "./collaborators-list"
import ActivityFeed from "./activity-feed"
import MCPServerMonitor from "./mcp-server-monitor"
import { cn } from "@/lib/utils"

export default function CollaborationDashboard() {
  const [activeTab, setActiveTab] = useState<"collaborators" | "activity" | "mcp">("collaborators")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [collaborationLink, setCollaborationLink] = useState("https://runash.ai/collaborate/proj_abc123")

  const invitationRoles = [
    { id: "editor", label: "Editor", description: "Can edit and create content" },
    { id: "viewer", label: "Viewer", description: "Can only view content" },
    { id: "admin", label: "Admin", description: "Full access and permissions" },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Collaboration Hub</h1>
            <p className="text-muted-foreground mt-1">Manage team collaboration and real-time editing</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Invite Collaborator
          </button>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg max-w-md w-full">
              <div className="flex items-center justify-between border-b border-border p-4">
                <h2 className="text-lg font-semibold">Invite Collaborator</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Role</label>
                  <div className="space-y-2">
                    {invitationRoles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded"
                      >
                        <input type="radio" name="role" defaultChecked={role.id === "editor"} className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span>Send invitation email</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors">
                    Send Invite
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sharing Link */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Share Project Link</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={collaborationLink}
              readOnly
              className="flex-1 px-3 py-2 bg-muted rounded text-sm focus:outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(collaborationLink)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { id: "collaborators", label: "Collaborators", icon: Users },
            { id: "activity", label: "Activity Feed", icon: Activity },
            { id: "mcp", label: "MCP Servers", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {activeTab === "collaborators" && <CollaboratorsList />}
        {activeTab === "activity" && <ActivityFeed />}
        {activeTab === "mcp" && <MCPServerMonitor />}
      </div>
    </div>
  )
}
