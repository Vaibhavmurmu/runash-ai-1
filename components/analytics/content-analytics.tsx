"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { AnalyticsFilters, ContentPerformance } from "@/types/analytics"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Clock, Eye, Share2 } from "lucide-react"
import { AnalyticsService } from "@/lib/analytics-service"

interface ContentAnalyticsProps {
  filters: AnalyticsFilters
}

function getPeriodValue(filters: AnalyticsFilters): string {
  const period = (filters as any)?.period
  if (typeof period === "string") return period
  const label = typeof period?.label === "string" ? period.label.toLowerCase() : ""
  if (label.includes("24") || label.includes("1d")) return "1d"
  if (label.includes("7")) return "7d"
  if (label.includes("30")) return "30d"
  if (label.includes("90")) return "90d"
  if (label.includes("year") || label.includes("1y")) return "1y"
  return "30d"
}

export function ContentAnalytics({ filters }: ContentAnalyticsProps) {
  const [contentData, setContentData] = useState<ContentPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const service = AnalyticsService.getInstance()
        const data = await service.getContentAnalytics(getPeriodValue(filters), (filters as any)?.streamId, {
          platforms: filters.platforms,
          categories: filters.categories,
          streamTypes: filters.streamTypes,
        })

        if (!cancelled) {
          setContentData(data as ContentPerformance)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load content analytics")
          setContentData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [filters])

  if (loading) return <div className="text-sm text-muted-foreground">Loading content analytics…</div>
  if (error) return <div className="text-sm text-destructive">Unable to load content analytics: {error}</div>
  if (!contentData) return <div className="text-sm text-muted-foreground">No content analytics data is available.</div>

  const hasContent =
    contentData.categoryPerformance.length > 0 || contentData.topClips.length > 0 || contentData.topMoments.length > 0

  if (!hasContent) {
    return <div className="text-sm text-muted-foreground">No content analytics found for the selected filters.</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
          <CardDescription>Average viewers by content category</CardDescription>
        </CardHeader>
        <CardContent>
          {contentData.categoryPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No category performance data found.</p>
          ) : (
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  avgViewers: { label: "Average Viewers", color: "hsl(var(--chart-1))" },
                  avgEngagement: { label: "Engagement Rate (%)", color: "hsl(var(--chart-2))" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contentData.categoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avgViewers" name="avgViewers" fill="var(--color-avgViewers)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgEngagement" name="avgEngagement" fill="var(--color-avgEngagement)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Clips</CardTitle>
          <CardDescription>Most viewed clips from your streams</CardDescription>
        </CardHeader>
        <CardContent>
          {contentData.topClips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No top clips found.</p>
          ) : (
            <div className="space-y-4">
              {contentData.topClips.map((clip) => (
                <div key={clip.id} className="flex items-start space-x-4 border-b pb-4 last:border-0 last:pb-0">
                  <Avatar className="h-20 w-30 rounded-md">
                    {clip.thumbnailUrl ? <AvatarImage src={clip.thumbnailUrl} alt={clip.title} className="object-cover" /> : null}
                    <AvatarFallback className="rounded-md bg-gradient-to-br from-orange-500 to-amber-300 text-white">Clip</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{clip.title}</h4>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center"><Eye className="h-3.5 w-3.5 mr-1" />{clip.views.toLocaleString()} views</div>
                      <div className="flex items-center"><Share2 className="h-3.5 w-3.5 mr-1" />{clip.shares.toLocaleString()} shares</div>
                      <div className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1" />{clip.duration}s</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Stream Moments</CardTitle>
          <CardDescription>Highest engagement points during your streams</CardDescription>
        </CardHeader>
        <CardContent>
          {contentData.topMoments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No top stream moments found.</p>
          ) : (
            <div className="space-y-4">
              {contentData.topMoments.map((moment, index) => (
                <div key={`${moment.timestamp}-${index}`} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <h4 className="font-medium">{moment.title}</h4>
                    <p className="text-sm text-muted-foreground">{new Date(moment.timestamp).toLocaleDateString()} at {new Date(moment.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">+{moment.viewerSpike} viewers</Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">+{moment.chatSpike} messages</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
