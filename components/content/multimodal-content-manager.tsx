'use client'

import React, { useState, useRef } from 'react'
import { Upload, FileVideo, ImageIcon, Music, FileText, Search, Filter, Shirt as Sort, MoreVertical, Eye, Edit, Download, Trash2, Share2, Plus, Grid3x3, List, Tag, Calendar, HardDrive, Zap, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentItem {
  id: string
  name: string
  type: 'video' | 'image' | 'audio' | 'document'
  size: string
  sizeBytes: number
  format: string
  duration?: string
  createdDate: Date
  modifiedDate: Date
  status: 'processing' | 'ready' | 'error'
  thumbnail?: string
  tags: string[]
  starred: boolean
  selected: boolean
}

interface ContentStats {
  totalItems: number
  totalSize: string
  byType: Record<string, number>
  storageUsed: number
  storageLimit: number
}

export default function MultimodalContentManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [contents, setContents] = useState<ContentItem[]>([
    {
      id: '1',
      name: 'Product Launch Video',
      type: 'video',
      size: '2.4GB',
      sizeBytes: 2400,
      format: 'MP4',
      duration: '12:34',
      createdDate: new Date(Date.now() - 86400000),
      modifiedDate: new Date(Date.now() - 3600000),
      status: 'ready',
      tags: ['marketing', 'product'],
      starred: true,
      selected: false,
    },
    {
      id: '2',
      name: 'Brand Guidelines',
      type: 'document',
      size: '1.2MB',
      sizeBytes: 1.2,
      format: 'PDF',
      createdDate: new Date(Date.now() - 172800000),
      modifiedDate: new Date(Date.now() - 172800000),
      status: 'ready',
      tags: ['branding'],
      starred: false,
      selected: false,
    },
    {
      id: '3',
      name: 'Background Music Track',
      type: 'audio',
      size: '45MB',
      sizeBytes: 45,
      format: 'MP3',
      duration: '3:45',
      createdDate: new Date(Date.now() - 259200000),
      modifiedDate: new Date(Date.now() - 259200000),
      status: 'ready',
      tags: ['audio', 'royalty-free'],
      starred: false,
      selected: false,
    },
    {
      id: '4',
      name: 'Social Media Banner',
      type: 'image',
      size: '3.2MB',
      sizeBytes: 3.2,
      format: 'PNG',
      createdDate: new Date(Date.now() - 345600000),
      modifiedDate: new Date(),
      status: 'processing',
      tags: ['social', 'graphics'],
      starred: false,
      selected: false,
    },
  ])

  const dragZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const stats: ContentStats = {
    totalItems: contents.length,
    totalSize: '5.7GB',
    byType: {
      video: 1,
      image: 1,
      audio: 1,
      document: 1,
    },
    storageUsed: 5700,
    storageLimit: 10000,
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Handle dropped files
    console.log('Files dropped:', e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) {
      console.log('Files selected:', files)
    }
  }

  const toggleStar = (id: string) => {
    setContents(contents.map(item =>
      item.id === id ? { ...item, starred: !item.starred } : item
    ))
  }

  const toggleSelect = (id: string) => {
    setContents(contents.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ))
  }

  const filteredContents = contents.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    return matchesSearch && matchesType
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <FileVideo className="w-4 h-4" />
      case 'image': return <ImageIcon className="w-4 h-4" />
      case 'audio': return <Music className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'text-blue-500'
      case 'image': return 'text-green-500'
      case 'audio': return 'text-purple-500'
      case 'document': return 'text-orange-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing': return <Clock className="w-4 h-4 text-blue-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Content Manager</h1>
            <p className="text-muted-foreground">Manage all your media and project files</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Items</div>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Size</div>
            <div className="text-2xl font-bold">{stats.totalSize}</div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Storage Used</div>
            <div className="text-2xl font-bold">{stats.storageUsed / stats.storageLimit * 100 | 0}%</div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${stats.storageUsed / stats.storageLimit * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Processing</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              1
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Filters and Search */}
          <div className="border-b border-border/40 bg-background/80 backdrop-blur-md p-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted/50 border border-border/40 px-4 py-2 pl-10 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-muted/50 border border-border/40 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Types</option>
                <option value="video">Videos</option>
                <option value="image">Images</option>
                <option value="audio">Audio</option>
                <option value="document">Documents</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-muted/50 border border-border/40 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>

              <div className="flex gap-2">
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
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredContents.length === 0 && searchQuery === '' ? (
              /* Empty State with Drag Zone */
              <div
                ref={dragZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors h-full flex items-center justify-center",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/40 hover:border-primary/50"
                )}
              >
                <div>
                  <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No files yet</h3>
                  <p className="text-muted-foreground mb-6">Drag files here or click upload to get started</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Choose Files
                  </button>
                </div>
              </div>
            ) : filteredContents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No files match your search</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContents.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-card border border-border/40 rounded-lg overflow-hidden hover:border-primary/50 transition-all group cursor-pointer",
                      item.selected && "ring-2 ring-primary"
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-40 bg-muted overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <span className={cn("text-4xl", getTypeColor(item.type))}>
                          {getTypeIcon(item.type)}
                        </span>
                      </div>
                      {item.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {item.duration}
                        </div>
                      )}
                    </div>

                    {/* Content Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.format} • {item.size}</p>
                        </div>
                        <button
                          onClick={() => toggleStar(item.id)}
                          className={cn(
                            "flex-shrink-0",
                            item.starred ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                          )}
                        >
                          ★
                        </button>
                      </div>

                      {/* Status and Tags */}
                      <div className="flex items-center gap-2 mb-3">
                        {getStatusIcon(item.status)}
                        <span className="text-xs text-muted-foreground capitalize">{item.status}</span>
                      </div>

                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="flex-1 flex items-center justify-center gap-2 px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded text-xs font-medium transition-colors">
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 px-2 py-1 bg-muted hover:bg-primary/20 rounded text-xs font-medium transition-colors">
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-2">
                {filteredContents.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-card border border-border/40 rounded-lg p-4 flex items-center gap-4 hover:border-primary/50 transition-all group",
                      item.selected && "ring-2 ring-primary"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded"
                    />

                    <div className={cn("text-lg", getTypeColor(item.type))}>
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{item.name}</h4>
                      <p className="text-xs text-muted-foreground">{item.format} • {item.size}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.createdDate.toLocaleDateString()}</span>
                      <span>
                        {getStatusIcon(item.status)}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Table Manager */}
        <aside className="w-80 border-l border-border/40 bg-sidebar overflow-y-auto p-6 space-y-4">
          <div>
            <h3 className="font-bold mb-4">Content Types</h3>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type === 'video' ? 'video' : type === 'image' ? 'image' : type === 'audio' ? 'audio' : 'document')}
                  className="w-full flex items-center justify-between p-3 bg-card rounded-lg border border-border/40 hover:border-primary/50 transition-colors text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className={getTypeColor(type)}>{getTypeIcon(type)}</span>
                    <span className="capitalize">{type}s</span>
                  </span>
                  <span className="font-semibold">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/40 pt-4">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                Create Folder
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 bg-muted hover:bg-primary/10 rounded-lg transition-colors text-sm font-medium">
                <Tag className="w-4 h-4" />
                Manage Tags
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
