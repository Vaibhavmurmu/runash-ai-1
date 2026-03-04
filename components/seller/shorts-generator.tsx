"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type ClipAsset = {
  id: string
  title: string
  description: string
  captionText: string
  durationSeconds: number
  score: number
  reviewStatus: string
  previewUrl: string
}

type ClipJob = {
  id: string
  status: string
  progress: number
  pipelineStage: string
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Failed to load clips data")
  const payload = (await response.json()) as { data?: T; assets?: T }
  return (payload.data || payload.assets || payload) as T
}

export function ShortsGenerator() {
  const [sourceUploadKey, setSourceUploadKey] = useState("")
  const [titleHint, setTitleHint] = useState("Best Moments")
  const [jobId, setJobId] = useState<string | null>(null)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [reviewRequired, setReviewRequired] = useState(true)
  const [channels] = useState(["instagram_reels", "youtube_shorts", "tiktok"])

  const { data: assetsData, mutate: refreshAssets } = useSWR<{ assets: ClipAsset[] }>("/api/seller/clips/assets", fetcher)
  const { data: jobData, mutate: refreshJob } = useSWR<{ job: ClipJob }>(
    jobId ? `/api/seller/clips/jobs/${jobId}` : null,
    fetcher,
    { refreshInterval: 2000 },
  )

  const currentJob = jobData?.job
  const generatedAssets = assetsData?.assets ?? []

  const reviewQueue = useMemo(
    () => generatedAssets.filter((asset) => asset.reviewStatus === "pending_review" || asset.reviewStatus === "in_review"),
    [generatedAssets],
  )

  const startGeneration = async () => {
    const response = await fetch("/api/seller/clips/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceUploadKey: sourceUploadKey.trim() || undefined,
        titleHint,
        clipCount: 3,
        channels,
        reviewRequired,
      }),
    })

    if (!response.ok) return

    const payload = (await response.json()) as { data?: { job: ClipJob } }
    const nextJobId = payload.data?.job.id
    if (nextJobId) {
      setJobId(nextJobId)
      void refreshJob()
      void refreshAssets()
    }
  }

  const publish = async (reviewAction?: "submit_for_review" | "approve_and_publish") => {
    if (selectedAssetIds.length === 0) return

    await fetch("/api/seller/clips/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetIds: selectedAssetIds,
        channels,
        reviewAction,
      }),
    })

    setSelectedAssetIds([])
    void refreshAssets()
    void refreshJob()
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Generate Shorts/Reels</CardTitle>
          <CardDescription>Upload source media key, run AI highlight pipeline, review, and publish in one click.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="source-upload-key">Source upload key (from cloud storage)</Label>
            <Input
              id="source-upload-key"
              value={sourceUploadKey}
              onChange={(event) => setSourceUploadKey(event.target.value)}
              placeholder="users/123/recordings/stream-1.mp4"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title-hint">Title hint</Label>
            <Input id="title-hint" value={titleHint} onChange={(event) => setTitleHint(event.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reviewRequired} onChange={(event) => setReviewRequired(event.target.checked)} />
            Human touch optional: require review/edit queue before publish
          </label>

          <div className="flex gap-2">
            <Button onClick={startGeneration}>Start clip job</Button>
            <Button variant="outline" onClick={() => refreshAssets()}>
              Refresh assets
            </Button>
          </div>

          {currentJob && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Job stage: {currentJob.pipelineStage}</span>
                <Badge variant="outline">{currentJob.status}</Badge>
              </div>
              <Progress value={currentJob.progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>Optional review/edit step before pushing to channels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewQueue.length === 0 && <p className="text-sm text-muted-foreground">No assets waiting for review.</p>}
          {reviewQueue.map((asset) => (
            <div key={asset.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{asset.title}</p>
                <Badge>{asset.reviewStatus}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{asset.description}</p>
              <p className="text-xs">Caption: {asset.captionText}</p>
            </div>
          ))}
          {reviewQueue.length > 0 && (
            <Button variant="outline" onClick={() => publish("submit_for_review")}>Send selected to editor queue</Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Generated clip assets</CardTitle>
          <CardDescription>Preview and publish clips to Instagram Reels, YouTube Shorts, and TikTok.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {generatedAssets.length === 0 && <p className="text-sm text-muted-foreground">No generated clips yet.</p>}
          {generatedAssets.map((asset) => (
            <label key={asset.id} className="rounded-md border p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{asset.title}</p>
                  <p className="text-xs text-muted-foreground">{asset.durationSeconds}s • score {asset.score.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{asset.reviewStatus}</Badge>
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={(event) =>
                      setSelectedAssetIds((current) =>
                        event.target.checked ? [...current, asset.id] : current.filter((id) => id !== asset.id),
                      )
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{asset.description}</p>
              {asset.previewUrl && (
                <a href={asset.previewUrl} target="_blank" rel="noreferrer" className="text-xs underline">
                  Open preview
                </a>
              )}
            </label>
          ))}

          <div className="flex gap-2">
            <Button onClick={() => publish("approve_and_publish")}>One-click publish</Button>
            <Button variant="outline" onClick={() => publish("submit_for_review")}>Move to review queue</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
