"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { getStreamLiveMetrics, type StreamHealthStatus, type StreamNetworkSample } from "@/lib/stream-session-contract"

interface StreamHealthProps {
  streamId?: string
}

const stateOrder: Record<StreamHealthStatus, number> = { excellent: 4, good: 3, fair: 2, poor: 1 }

export function StreamHealth({ streamId }: StreamHealthProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [samples, setSamples] = useState<StreamNetworkSample[]>([])

  useEffect(() => {
    if (!streamId) return
    let alive = true
    const load = async () => {
      try {
        const { network } = await getStreamLiveMetrics(streamId)
        if (alive) setSamples(network.series)
      } catch {
        if (alive) setSamples([])
      }
    }

    void load()
    const interval = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [streamId])

  const latest = samples.at(-1)
  const healthScore = latest?.healthScore ?? 0
  const status = latest?.health ?? "poor"

  const warning = useMemo(() => {
    if (!latest) return "No network telemetry reported yet."
    if (latest.packetLossPct > 2.5) return "Packet loss is elevated and may impact playback smoothness."
    if (latest.rttMs > 220) return "High RTT detected; consider switching to a lower-latency network path."
    if (latest.reconnects > 0) return "Reconnect event detected; review connectivity stability."
    return "Network telemetry is stable for this stream window."
  }, [latest])

  const chartData = samples.map((sample, index) => ({
    time: `${index + 1}`,
    bitrateKbps: sample.bitrateKbps,
    rttMs: sample.rttMs,
    packetLossPct: sample.packetLossPct,
    droppedFrames: sample.droppedFrames,
    reconnects: sample.reconnects,
    healthScore: sample.healthScore,
  }))

  const issues = latest && stateOrder[latest.health] <= stateOrder.fair

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stream Health</CardTitle>
            <CardDescription>Network telemetry and derived quality state over time</CardDescription>
          </div>
          <Badge variant={issues ? "destructive" : "secondary"}>{status.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!streamId ? <p className="text-sm text-muted-foreground">Select a stream to review telemetry history.</p> : null}

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bitrate">Bitrate</TabsTrigger>
            <TabsTrigger value="rtt">RTT</TabsTrigger>
            <TabsTrigger value="loss">Packet Loss</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Health Score</span>
                <span className="text-sm font-medium">{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>Bitrate: <span className="font-semibold">{latest?.bitrateKbps?.toLocaleString() ?? "—"} kbps</span></div>
              <div>RTT: <span className="font-semibold">{latest?.rttMs?.toFixed(0) ?? "—"} ms</span></div>
              <div>Packet loss: <span className="font-semibold">{latest?.packetLossPct?.toFixed(2) ?? "—"}%</span></div>
              <div>Dropped frames: <span className="font-semibold">{latest?.droppedFrames ?? "—"}</span></div>
              <div>Reconnects: <span className="font-semibold">{latest?.reconnects ?? "—"}</span></div>
            </div>
            <div className={`flex items-start gap-2 text-sm ${issues ? "text-yellow-600" : "text-green-600"}`}>
              {issues ? <AlertTriangle className="h-4 w-4 mt-0.5" /> : <CheckCircle className="h-4 w-4 mt-0.5" />}
              <span>{warning}</span>
            </div>
          </TabsContent>

          <TabsContent value="bitrate" className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="bitrateKbps" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="rtt" className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="rttMs" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="loss" className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="packetLossPct" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
