'use client'

import React, { useState } from 'react'
import {
  Play, Pause, Square, Settings, Share2, MoreVertical, Volume2,
  Radio, Eye, Heart, MessageSquare, Plus, X, Copy, Link2,
  TrendingUp, Users, Zap, Clock, Cpu, Wifi, WifiOff,
  Send, Maximize2, Minimize2, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle, Loader
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreamChannel {
  id: string
  platform: 'youtube' | 'twitch' | 'facebook' | 'instagram' | 'tiktok'
  name: string
  streamKey: string
  isLive: boolean
  status: 'live' | 'stopped' | 'starting' | 'error'
  viewers: number
  duration: string
  bitrate: string
  fps: number
  resolution: string
  uptime: number
}

interface StreamStats {
  totalViewers: number
  totalEngagement: number
  peakViewers: number
  avgViewDuration: string
  bounceRate: number
}

interface ChatMessage {
  id: string
  username: string
  message: string
  timestamp: Date
  platform: string
  isModerator: boolean
}

export default function LiveStreamingDashboard() {
  const [channels, setChannels] = useState<StreamChannel[]>([
    {
      id: '1',
      platform: 'youtube',
      name: 'YouTube Live',
      streamKey: 'rtmp://a.rtmp.youtube.com/live2/xxx',
      isLive: true,
      status: 'live',
      viewers: 2847,
      duration: '01:34:22',
      bitrate: '8500 kbps',
      fps: 60,
      resolution: 1080,
      uptime: 5662,
    },
    {
      id: '2',
      platform: 'twitch',
      name: 'Twitch Stream',
      streamKey: 'rtmp://live-sjc.twitch.tv/live/xxx',
      isLive: true,
      status: 'live',
      viewers: 1523,
      duration: '01:34:15',
      bitrate: '8000 kbps',
      fps: 60,
      resolution: 1080,
      uptime: 5655,
    },
    {
      id: '3',
      platform: 'facebook',
      name: 'Facebook Live',
      streamKey: 'rtmps://live-api-s.facebook.com:443/rtmp/xxx',
      isLive: true,
      status: 'live',
      viewers: 892,
      duration: '01:34:10',
      bitrate: '6000 kbps',
      fps: 30,
      resolution: 720,
      uptime: 5650,
    },
  ])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'User1',
      message: 'Great stream! Love the content',
      timestamp: new Date(Date.now() - 5000),
      platform: 'youtube',
      isModerator: false,
    },
    {
      id: '2',
      username: 'Moderator',
      message: 'Welcome everyone!',
      timestamp: new Date(Date.now() - 3000),
      platform: 'twitch',
      isModerator: true,
    },
  ])

  const [selectedChannel, setSelectedChannel] = useState<string>('1')
  const [chatInput, setChatInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  const stats: StreamStats = {
    totalViewers: channels.reduce((sum, c) => sum + c.viewers, 0),
    totalEngagement: 1234,
    peakViewers: 3200,
    avgViewDuration: '12m 34s',
    bounceRate: 8.5,
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'text-red-500'
      case 'twitch': return 'text-purple-500'
      case 'facebook': return 'text-blue-500'
      case 'instagram': return 'text-pink-500'
      case 'tiktok': return 'text-black dark:text-white'
      default: return 'text-gray-500'
    }
  }

  const getPlatformIcon = (platform: string) => platform.charAt(0).toUpperCase() + platform.slice(1)

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      username: 'You',
      message: chatInput,
      timestamp: new Date(),
      platform: 'all',
      isModerator: true,
    }
    setChatMessages([...chatMessages, newMessage])
    setChatInput('')
  }

  const selectedChannelData = channels.find(c => c.id === selectedChannel)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Radio className="w-8 h-8 text-primary animate-pulse" />
              Live Streaming Dashboard
            </h1>
            <p className="text-muted-foreground">Manage multiple streaming channels in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Stream
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Viewers</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              {stats.totalViewers.toLocaleString()}
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Peak Viewers</div>
            <div className="text-3xl font-bold">{stats.peakViewers.toLocaleString()}</div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Engagement</div>
            <div className="text-3xl font-bold text-primary">{stats.totalEngagement}</div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Avg View Time</div>
            <div className="text-2xl font-bold">{stats.avgViewDuration}</div>
          </div>
          <div className="bg-card border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Active Channels</div>
            <div className="text-3xl font-bold">{channels.filter(c => c.isLive).length}/{channels.length}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview */}
          <div className="bg-black rounded-lg overflow-hidden mb-4 aspect-video">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
              <div className="text-center">
                <Radio className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
                <p className="text-muted-foreground">Stream preview</p>
              </div>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all",
                  selectedChannel === channel.id
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                    : "bg-card border border-border/40 hover:border-primary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("text-sm font-bold", getPlatformColor(channel.platform))}>
                  {getPlatformIcon(channel.platform)}
                </span>
                <span>{channel.name}</span>
                <Users className="w-3 h-3" />
                <span className="text-sm">{channel.viewers}</span>
                {channel.status === 'live' && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Channel Details */}
          {selectedChannelData && (
            <div className="bg-card border border-border/40 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Duration</div>
                  <div className="font-bold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedChannelData.duration}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Bitrate</div>
                  <div className="font-bold flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    {selectedChannelData.bitrate}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">FPS</div>
                  <div className="font-bold flex items-center gap-1">
                    <Cpu className="w-4 h-4" />
                    {selectedChannelData.fps}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Resolution</div>
                  <div className="font-bold">{selectedChannelData.resolution}p</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Status</div>
                  <div className="flex items-center gap-1 font-bold">
                    {selectedChannelData.status === 'live' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Live</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        <span className="text-yellow-500">Starting</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stream Actions */}
          <div className="flex gap-2 mb-4">
            {selectedChannelData && (
              <>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium">
                  <Link2 className="w-4 h-4" />
                  Copy Stream Key
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-primary/10 rounded-lg transition-colors font-medium">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-primary/10 rounded-lg transition-colors font-medium">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Chat & Info */}
        <div className="w-80 flex flex-col overflow-hidden border-l border-border/40 bg-sidebar rounded-lg">
          {/* Tabs */}
          <div className="flex border-b border-border/40">
            <button className="flex-1 px-4 py-3 font-medium border-b-2 border-primary text-primary">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Chat
            </button>
            <button className="flex-1 px-4 py-3 font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground">
              <Heart className="w-4 h-4 inline mr-2" />
              Activity
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "font-semibold",
                    msg.isModerator ? "text-green-500" : "text-foreground"
                  )}>
                    {msg.username}
                  </span>
                  {msg.isModerator && (
                    <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                      MOD
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-muted-foreground">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="border-t border-border/40 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send message..."
                className="flex-1 bg-muted border border-border/40 px-3 py-2 rounded text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
