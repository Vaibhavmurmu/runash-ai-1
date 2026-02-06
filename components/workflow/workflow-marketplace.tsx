'use client'

import React, { useState } from 'react'
import { WorkflowTemplate } from '@/lib/workflow/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star, Download, Eye, Share2, Search } from 'lucide-react'

interface WorkflowMarketplaceProps {
  onSelectTemplate?: (template: WorkflowTemplate) => void
}

const templates: WorkflowTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'YouTube Live Stream Optimizer',
    description: 'Auto-enhance video quality, add captions, and broadcast to YouTube',
    category: 'streaming',
    workflow: {
      id: 'wf-1',
      name: 'YouTube Stream',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    usageCount: 2543,
    rating: 4.8,
    creator: 'RunAsh Team',
  },
  {
    id: 'tmpl-2',
    name: 'AI Video Enhancement Pipeline',
    description: 'Upscale, denoise, and enhance video with AI models',
    category: 'ai',
    workflow: {
      id: 'wf-2',
      name: 'AI Enhancement',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    usageCount: 1832,
    rating: 4.9,
    creator: 'RunAsh Team',
  },
  {
    id: 'tmpl-3',
    name: 'Multi-Platform Stream Broadcast',
    description: 'Stream simultaneously to YouTube, Twitch, and TikTok',
    category: 'streaming',
    workflow: {
      id: 'wf-3',
      name: 'Multi-Stream',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    usageCount: 5120,
    rating: 4.7,
    creator: 'RunAsh Team',
  },
  {
    id: 'tmpl-4',
    name: 'Auto-Caption & Transcription',
    description: 'Generate captions and full transcripts with AI',
    category: 'automation',
    workflow: {
      id: 'wf-4',
      name: 'Auto-Caption',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    usageCount: 3456,
    rating: 4.6,
    creator: 'RunAsh Team',
  },
  {
    id: 'tmpl-5',
    name: 'Content Editing Suite',
    description: 'Complete video editing with effects, transitions, and overlays',
    category: 'video',
    workflow: {
      id: 'wf-5',
      name: 'Content Edit',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    usageCount: 4210,
    rating: 4.8,
    creator: 'RunAsh Team',
  },
  {
    id: 'tmpl-6',
    name: 'Recording & Archive Workflow',
    description: 'Record live streams and auto-organize archives',
    category: 'automation',
    workflow: {
      id: 'wf-6',
      name: 'Recording',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: {},
      outputs: {},
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    usageCount: 2890,
    rating: 4.5,
    creator: 'RunAsh Team',
  },
]

export function WorkflowMarketplace({ onSelectTemplate }: WorkflowMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = ['all', 'video', 'ai', 'streaming', 'automation', 'custom']

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Workflow Marketplace</h2>
        <p className="text-muted-foreground">
          Browse and use pre-built workflows for common video processing tasks
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <div className="text-4xl opacity-20">{template.category.charAt(0).toUpperCase()}</div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold line-clamp-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {template.description}
                </p>
              </div>

              <div className="flex items-center justify-between py-2 border-y">
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-500 text-yellow-500" />
                  <span className="text-sm font-semibold">{template.rating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({template.usageCount?.toLocaleString() || 0})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  by {template.creator}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => onSelectTemplate?.(template)}
                >
                  <Download size={14} className="mr-1" />
                  Use
                </Button>
                <Button variant="outline" size="sm">
                  <Eye size={14} />
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 size={14} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No workflows found matching your criteria</p>
        </Card>
      )}
    </div>
  )
}
