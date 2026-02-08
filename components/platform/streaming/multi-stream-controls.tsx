"use client"

import { Badge } from "lucide-react"

interface Channel {
  id: string
  name: string
  status: string
  icon: string
  viewers: number
}

interface MultiStreamControlsProps {
  channels: Channel[]
  isLive: boolean
}

export default function MultiStreamControls({ channels, isLive }: MultiStreamControlsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <div key={channel.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{channel.icon}</span>
                <h3 className="font-semibold">{channel.name}</h3>
              </div>
              <Badge variant={channel.status === "live" ? "default" : "secondary"} className="capitalize">
                {channel.status}
              </Badge>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Viewers</p>
              <p className="text-2xl font-bold">{channel.viewers.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Stream key"
                className="w-full px-3 py-2 bg-muted rounded text-sm"
                disabled
              />
              <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors">
                {isLive ? "Sync to Channel" : "Connect Channel"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stream Quality Settings */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Quality Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Resolution", value: "1080p" },
            { label: "Frame Rate", value: "60 FPS" },
            { label: "Bitrate", value: "6 Mbps" },
            { label: "Codec", value: "H.264" },
          ].map((setting, idx) => (
            <div key={idx}>
              <p className="text-sm text-muted-foreground mb-1">{setting.label}</p>
              <select className="w-full px-2 py-1 bg-muted rounded text-sm">
                <option>{setting.value}</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
