'use client'

import React, { useState } from 'react'
import { 
  Zap, MessageSquare, Video, Settings, Upload, Share2, 
  Plus, Search, Bell, LogOut, Menu, X, Grid3x3, ListFilter,
  BarChart3, Workflow, Users, Copy, Download, Trash2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardSection {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
}

interface ContentItem {
  id: string
  type: 'video' | 'image' | 'audio' | 'document'
  title: string
  thumbnail?: string
  createdAt: string
  size: string
  likes: number
  liked: boolean
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('workspace')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [contentItems, setContentItems] = useState<ContentItem[]>([
    {
      id: '1',
      type: 'video',
      title: 'AI Generated Product Demo',
      createdAt: '2 hours ago',
      size: '2.4GB',
      likes: 24,
      liked: false,
      thumbnail: 'bg-gradient-to-br from-blue-500 to-purple-600'
    },
    {
      id: '2',
      type: 'video',
      title: 'Live Stream Recording',
      createdAt: '5 hours ago',
      size: '1.8GB',
      likes: 18,
      liked: true,
      thumbnail: 'bg-gradient-to-br from-green-500 to-teal-600'
    },
    {
      id: '3',
      type: 'image',
      title: 'Social Media Clip',
      createdAt: '1 day ago',
      size: '450MB',
      likes: 42,
      liked: false,
      thumbnail: 'bg-gradient-to-br from-orange-500 to-red-600'
    },
  ])

  const mainSections: DashboardSection[] = [
    { id: 'workspace', label: 'Workspace', icon: <Workflow className="w-5 h-5" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'editor', label: 'Editor', icon: <Video className="w-5 h-5" /> },
    { id: 'library', label: 'Library', icon: <Grid3x3 className="w-5 h-5" /> },
  ]

  const secondarySections: DashboardSection[] = [
    { id: 'models', label: 'Models', icon: <Zap className="w-5 h-5" /> },
    { id: 'streaming', label: 'Streaming', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'collaboration', label: 'Collaboration', icon: <Users className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const toggleLike = (id: string) => {
    setContentItems(items => 
      items.map(item => 
        item.id === id ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 } : item
      )
    )
  }

  const deleteItem = (id: string) => {
    setContentItems(items => items.filter(item => item.id !== id))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary via-accent to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                R
              </div>
              <span className="font-bold text-lg hidden sm:block">RunAsh</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-auto">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search content, models, workflows..."
              className="flex-1 bg-muted/50 border border-border/40 px-3 py-2 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                rightPanelOpen ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <aside
          className={cn(
            "border-r border-border/40 bg-sidebar transition-all duration-300",
            sidebarOpen ? "w-64" : "w-0 overflow-hidden"
          )}
        >
          <div className="p-4 h-full overflow-y-auto">
            {/* Main Navigation */}
            <div className="space-y-1 mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Main</p>
              {mainSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-border/40 pt-4 mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">Tools</p>
              {secondarySections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </div>

            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Plus className="w-4 h-4" />
              <span>New Workflow</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeSection === 'workspace' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Workspace</h1>
                    <p className="text-muted-foreground">Manage your content and workflows</p>
                  </div>
                  <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-border/40 rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                    <Video className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">Generate Video</h3>
                    <p className="text-sm text-muted-foreground">Create new AI video</p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-lg p-4 hover:border-accent/50 transition-colors cursor-pointer">
                    <MessageSquare className="w-8 h-8 text-accent mb-3" />
                    <h3 className="font-semibold mb-1">New Chat</h3>
                    <p className="text-sm text-muted-foreground">Start conversation</p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-lg p-4 hover:border-blue-500/50 transition-colors cursor-pointer">
                    <Workflow className="w-8 h-8 text-blue-500 mb-3" />
                    <h3 className="font-semibold mb-1">New Workflow</h3>
                    <p className="text-sm text-muted-foreground">Build automation</p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-lg p-4 hover:border-green-500/50 transition-colors cursor-pointer">
                    <Share2 className="w-8 h-8 text-green-500 mb-3" />
                    <h3 className="font-semibold mb-1">Go Live</h3>
                    <p className="text-sm text-muted-foreground">Start streaming</p>
                  </div>
                </div>

                {/* Content Library */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Recent Content</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          viewMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        )}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        )}
                      >
                        <ListFilter className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className={cn(
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "space-y-3"
                  )}>
                    {contentItems.map((item) => (
                      viewMode === 'grid' ? (
                        <div
                          key={item.id}
                          className="group bg-card border border-border/40 rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer"
                        >
                          <div className={cn("h-40 bg-muted relative overflow-hidden", item.thumbnail)}>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Video className="w-12 h-12 text-white" />
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold mb-1 line-clamp-2">{item.title}</h3>
                            <p className="text-xs text-muted-foreground mb-3">{item.createdAt} • {item.size}</p>
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => toggleLike(item.id)}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                              >
                                <span className={cn(
                                  "text-xl",
                                  item.liked ? "text-primary" : ""
                                )}>
                                  {item.liked ? '❤️' : '🤍'}
                                </span>
                                <span>{item.likes}</span>
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className="bg-card border border-border/40 rounded-lg p-4 flex items-center justify-between hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={cn("w-16 h-16 rounded bg-muted", item.thumbnail)} />
                            <div className="flex-1">
                              <h3 className="font-semibold">{item.title}</h3>
                              <p className="text-sm text-muted-foreground">{item.createdAt} • {item.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => toggleLike(item.id)}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <span className={cn(
                                "text-lg",
                                item.liked ? "text-primary" : ""
                              )}>
                                {item.liked ? '❤️' : '🤍'}
                              </span>
                              <span>{item.likes}</span>
                            </button>
                            <button className="p-1 hover:bg-muted rounded transition-colors" title="Copy">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button className="p-1 hover:bg-muted rounded transition-colors" title="Download">
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-1 hover:bg-destructive/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'chat' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Chat Interface</h2>
                  <p className="text-muted-foreground">Navigate to /platform/workspace to access the chat interface</p>
                </div>
              </div>
            )}

            {activeSection === 'editor' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Video Editor</h2>
                  <p className="text-muted-foreground">Navigate to /platform/editor to access the video editor</p>
                </div>
              </div>
            )}

            {activeSection === 'library' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Grid3x3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Media Library</h2>
                  <p className="text-muted-foreground">Navigate to /platform/library to access your media library</p>
                </div>
              </div>
            )}

            {activeSection === 'models' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Model Management</h2>
                  <p className="text-muted-foreground">Navigate to /platform/models to manage AI models</p>
                </div>
              </div>
            )}

            {activeSection === 'streaming' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Live Streaming</h2>
                  <p className="text-muted-foreground">Navigate to /platform/streaming to manage streams</p>
                </div>
              </div>
            )}

            {activeSection === 'collaboration' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Collaboration</h2>
                  <p className="text-muted-foreground">Navigate to /platform/collaboration to collaborate with teams</p>
                </div>
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Settings</h2>
                  <p className="text-muted-foreground">Configure your preferences and account settings</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Panel */}
        {rightPanelOpen && (
          <aside className="w-80 border-l border-border/40 bg-sidebar overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-bold mb-4">Quick Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm">Dark Mode</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-sm">Notifications</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" />
                    <span className="text-sm">Auto-save</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-border/40 pt-6">
                <h3 className="font-bold mb-4">Recent Models</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-card rounded-lg border border-border/40 hover:border-primary/50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">WAN 2.1</p>
                    <p className="text-xs text-muted-foreground">Video generation</p>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border/40 hover:border-primary/50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">GPT-4 Vision</p>
                    <p className="text-xs text-muted-foreground">Analysis</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-6">
                <h3 className="font-bold mb-3 text-sm">System Status</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Health</span>
                    <span className="text-green-500 font-medium">Operational</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Storage</span>
                    <span>2.4 / 10 GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Processing</span>
                    <span className="text-primary font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
