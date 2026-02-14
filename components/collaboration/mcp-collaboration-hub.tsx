'use client'

import React, { useState } from 'react'
import {
  Users, MessageSquare, Share2, Edit, Save, Copy, Eye,
  AlertCircle, CheckCircle, Clock, Zap, Server, Link2,
  Plus, X, ChevronRight, Activity, Signal, Wifi, MoreVertical,
  GitBranch, Lock, Unlock, Pause, Play, RotateCcw, Layers,
  User, Mail, Phone, MapPin, Shield, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Collaborator {
  id: string
  name: string
  email: string
  avatar: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'online' | 'away' | 'offline'
  lastActive: Date
  isEditing: boolean
  editingElement?: string
}

interface MCPServer {
  id: string
  name: string
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  endpoint: string
  ping: number
  version: string
  capabilities: string[]
  activeChannels: number
  lastSync: Date
}

interface CollaborationSession {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  participants: number
  isLocked: boolean
  version: number
  autoSave: boolean
  conflictMode: 'merge' | 'lock' | 'accept'
}

export default function MCPCollaborationHub() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'You',
      email: 'you@example.com',
      avatar: '👤',
      role: 'admin',
      status: 'online',
      lastActive: new Date(),
      isEditing: true,
      editingElement: 'Video Timeline',
    },
    {
      id: '2',
      name: 'Alex Designer',
      email: 'alex@example.com',
      avatar: '🎨',
      role: 'editor',
      status: 'online',
      lastActive: new Date(),
      isEditing: true,
      editingElement: 'AI Model Config',
    },
    {
      id: '3',
      name: 'Sam Editor',
      email: 'sam@example.com',
      avatar: '✂️',
      role: 'editor',
      status: 'away',
      lastActive: new Date(Date.now() - 300000),
      isEditing: false,
    },
    {
      id: '4',
      name: 'Jordan Viewer',
      email: 'jordan@example.com',
      avatar: '👁️',
      role: 'viewer',
      status: 'online',
      lastActive: new Date(),
      isEditing: false,
    },
  ])

  const [mcpServers, setMcpServers] = useState<MCPServer[]>([
    {
      id: 'mcp-1',
      name: 'Primary MCP Server',
      status: 'connected',
      endpoint: 'ws://mcp-primary.runash.ai:8080',
      ping: 12,
      version: '2.1.0',
      capabilities: ['multi-channel', 'real-time-sync', 'conflict-resolution'],
      activeChannels: 3,
      lastSync: new Date(),
    },
    {
      id: 'mcp-2',
      name: 'Backup MCP Server',
      status: 'connected',
      endpoint: 'ws://mcp-backup.runash.ai:8081',
      ping: 34,
      version: '2.1.0',
      capabilities: ['failover', 'archiving'],
      activeChannels: 0,
      lastSync: new Date(Date.now() - 5000),
    },
    {
      id: 'mcp-3',
      name: 'Analytics MCP Server',
      status: 'connected',
      endpoint: 'ws://mcp-analytics.runash.ai:8082',
      ping: 8,
      version: '2.0.5',
      capabilities: ['metrics', 'monitoring', 'reporting'],
      activeChannels: 1,
      lastSync: new Date(),
    },
  ])

  const [sessions, setSessions] = useState<CollaborationSession[]>([
    {
      id: 'session-1',
      name: 'Product Launch Video',
      createdBy: 'You',
      createdAt: new Date(Date.now() - 3600000),
      participants: 2,
      isLocked: false,
      version: 45,
      autoSave: true,
      conflictMode: 'merge',
    },
  ])

  const [selectedServer, setSelectedServer] = useState<string>('mcp-1')
  const [activityLog, setActivityLog] = useState<any[]>([
    {
      id: '1',
      user: 'Alex Designer',
      action: 'Updated AI Model Config',
      timestamp: new Date(),
      type: 'edit',
    },
    {
      id: '2',
      user: 'You',
      action: 'Generated Video Preview',
      timestamp: new Date(Date.now() - 120000),
      type: 'generate',
    },
    {
      id: '3',
      user: 'Sam Editor',
      action: 'Saved Changes',
      timestamp: new Date(Date.now() - 300000),
      type: 'save',
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'active':
        return 'text-green-500'
      case 'away':
      case 'connecting':
        return 'text-yellow-500'
      case 'offline':
      case 'disconnected':
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'active':
        return 'bg-green-500/20'
      case 'away':
      case 'connecting':
        return 'bg-yellow-500/20'
      case 'offline':
      case 'disconnected':
      case 'error':
        return 'bg-red-500/20'
      default:
        return 'bg-gray-500/20'
    }
  }

  const selectedServerData = mcpServers.find(s => s.id === selectedServer)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-md p-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-4">
            <Users className="w-8 h-8 text-primary" />
            Collaboration Hub
          </h1>
          <p className="text-muted-foreground">Real-time teamwork with MCP server coordination</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left Panel - Collaborators */}
        <div className="w-80 flex flex-col border-r border-border/40 overflow-hidden">
          {/* Collaborators Section */}
          <div className="mb-4 flex flex-col h-1/2 overflow-hidden border border-border/40 rounded-lg bg-card">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Collaborators
              </h2>
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                {collaborators.filter(c => c.status === 'online').length} online
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {collaborators.map((collab) => (
                <div key={collab.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                      {collab.avatar}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
                      getStatusBg(collab.status)
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <p className="font-semibold text-sm truncate">{collab.name}</p>
                      {collab.role === 'admin' && (
                        <Shield className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{collab.role}</p>
                    {collab.isEditing && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        {collab.editingElement}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 p-3">
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-3 h-3" />
                Invite User
              </button>
            </div>
          </div>

          {/* Activity Log */}
          <div className="flex flex-col h-1/2 overflow-hidden border border-border/40 rounded-lg bg-card">
            <div className="p-4 border-b border-border/40 font-bold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Log
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activityLog.map((log) => (
                <div key={log.id} className="text-xs space-y-1 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="font-semibold">{log.user}</div>
                  <div className="text-muted-foreground">{log.action}</div>
                  <div className="text-muted-foreground text-[11px]">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - MCP Servers */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-4 rounded-lg border border-border/40 bg-card overflow-hidden">
            <div className="p-4 border-b border-border/40 font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              MCP Servers
            </div>

            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {mcpServers.map((server) => (
                <button
                  key={server.id}
                  onClick={() => setSelectedServer(server.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    selectedServer === server.id
                      ? "border-primary bg-primary/10"
                      : "border-border/40 hover:border-primary/50 bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {server.name}
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          server.status === 'connected' ? "bg-green-500" : "bg-red-500"
                        )} />
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">{server.endpoint}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold flex items-center gap-1">
                        <Signal className="w-3 h-3" />
                        {server.ping}ms
                      </div>
                      <p className="text-xs text-muted-foreground">v{server.version}</p>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {server.capabilities.map(cap => (
                      <span key={cap} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Active Channels: {server.activeChannels} | Last Sync: {server.lastSync.toLocaleTimeString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Server Details */}
          {selectedServerData && (
            <div className="flex-1 rounded-lg border border-border/40 bg-card overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border/40 font-bold">
                Server Configuration
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Connection Status */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">Connection Status</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <div className={cn("font-bold text-sm flex items-center gap-1", getStatusColor(selectedServerData.status))}>
                        {selectedServerData.status === 'connected' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Connected
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            Error
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Latency</div>
                      <div className="font-bold text-sm">{selectedServerData.ping}ms</div>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedServerData.capabilities.map(cap => (
                      <div key={cap} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {cap}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Management */}
                <div>
                  <h4 className="font-semibold mb-3 text-sm">Active Channels ({selectedServerData.activeChannels})</h4>
                  <div className="space-y-2">
                    {Array.from({ length: selectedServerData.activeChannels }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm">Channel #{i + 1}</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 p-3 flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-primary/10 rounded text-sm font-medium transition-colors">
                  <RotateCcw className="w-3 h-3" />
                  Reconnect
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-primary/10 rounded text-sm font-medium transition-colors">
                  <Settings className="w-3 h-3" />
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Session Controls */}
        <div className="w-96 flex flex-col border-l border-border/40 overflow-hidden">
          <div className="rounded-lg border border-border/40 bg-card overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-border/40 font-bold">
              Current Session
            </div>

            {sessions.length > 0 && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">{session.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Created by {session.createdBy} • {session.createdAt.toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Version</div>
                        <div className="font-bold">{session.version}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Participants</div>
                        <div className="font-bold">{session.participants}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Mode</div>
                        <div className="font-bold text-xs">{session.conflictMode}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={session.autoSave}
                          readOnly
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">Auto-save enabled</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={session.isLocked}
                          readOnly
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">Session locked</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors">
                        <Save className="w-3 h-3" />
                        Save Now
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-primary/10 rounded-lg text-sm font-medium transition-colors">
                        <Share2 className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border/40 p-3">
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                New Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
