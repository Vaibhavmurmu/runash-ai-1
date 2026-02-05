"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const agentPerformanceData = [
  { time: "00:00", salesBot: 94, engageBot: 87, analyticsBot: 100, inventoryBot: 91 },
  { time: "04:00", salesBot: 92, engageBot: 89, analyticsBot: 98, inventoryBot: 93 },
  { time: "08:00", salesBot: 96, engageBot: 85, analyticsBot: 100, inventoryBot: 89 },
  { time: "12:00", salesBot: 98, engageBot: 91, analyticsBot: 97, inventoryBot: 95 },
  { time: "16:00", salesBot: 95, engageBot: 88, analyticsBot: 100, inventoryBot: 92 },
  { time: "20:00", salesBot: 97, engageBot: 93, analyticsBot: 99, inventoryBot: 94 },
]

const agentTaskData = [
  { name: "Order Processing", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Customer Support", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Inventory Management", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Analytics", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Content Generation", value: 5, color: "hsl(var(--chart-5))" },
]

const chartConfig = {
  salesBot: {
    label: "SalesBot Pro",
    color: "hsl(var(--chart-1))",
  },
  engageBot: {
    label: "EngageBot",
    color: "hsl(var(--chart-2))",
  },
  analyticsBot: {
    label: "AnalyticsBot",
    color: "hsl(var(--chart-3))",
  },
  inventoryBot: {
    label: "InventoryBot",
    color: "hsl(var(--chart-4))",
  },
}

export function AIAgentMetrics() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance Over Time</CardTitle>
            <CardDescription>24-hour performance tracking for all AI agents</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={agentPerformanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis domain={[80, 100]} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="salesBot" stroke="var(--color-salesBot)" strokeWidth={2} />
                  <Line type="monotone" dataKey="engageBot" stroke="var(--color-engageBot)" strokeWidth={2} />
                  <Line type="monotone" dataKey="analyticsBot" stroke="var(--color-analyticsBot)" strokeWidth={2} />
                  <Line type="monotone" dataKey="inventoryBot" stroke="var(--color-inventoryBot)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>How AI agents spend their processing time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agentTaskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {agentTaskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Status & Metrics</CardTitle>
          <CardDescription>Current status and key performance indicators for each AI agent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              {
                name: "SalesBot Pro",
                status: "active",
                performance: 97,
                tasksCompleted: 1247,
                avgResponseTime: "0.3s",
                successRate: "94.2%",
                currentTask: "Processing customer orders",
              },
              {
                name: "EngageBot",
                status: "active",
                performance: 91,
                tasksCompleted: 892,
                avgResponseTime: "0.5s",
                successRate: "89.7%",
                currentTask: "Responding to live chat",
              },
              {
                name: "AnalyticsBot",
                status: "idle",
                performance: 100,
                tasksCompleted: 456,
                avgResponseTime: "1.2s",
                successRate: "100%",
                currentTask: "Monitoring stream metrics",
              },
              {
                name: "InventoryBot",
                status: "active",
                performance: 94,
                tasksCompleted: 678,
                avgResponseTime: "0.8s",
                successRate: "96.1%",
                currentTask: "Stock level optimization",
              },
            ].map((agent, index) => (
              <div key={index} className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${agent.status === "active" ? "bg-green-500" : "bg-gray-400"}`}
                    />
                    <h4 className="font-semibold">{agent.name}</h4>
                  </div>
                  <Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance</span>
                    <span>{agent.performance}%</span>
                  </div>
                  <Progress value={agent.performance} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Tasks Completed</div>
                    <div className="font-medium">{agent.tasksCompleted.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg Response</div>
                    <div className="font-medium">{agent.avgResponseTime}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Success Rate</div>
                    <div className="font-medium">{agent.successRate}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Current Task</div>
                    <div className="font-medium text-xs">{agent.currentTask}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

