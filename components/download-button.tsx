"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Wifi } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface DownloadButtonProps {
  recordingId: string
  recordingTitle: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "secondary" | "ghost" | "link"
  className?: string
}

export default function DownloadButton({
  recordingId,
  recordingTitle,
  size = "default",
  variant = "outline",
  className,
}: DownloadButtonProps) {
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // Mock download function - in a real app, this would handle the actual download
  const startDownload = (quality: string) => {
    if (isDownloading) return

    setIsDownloading(true)
    setDownloadProgress(0)

    // Show toast notification
    toast({
      title: "Download started",
      description: `Downloading "${recordingTitle}" in ${quality} quality`,
    })

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const newProgress = prev + Math.random() * 10
        if (newProgress >= 100) {
          clearInterval(interval)
          setIsDownloading(false)

          // Show completion toast
          toast({
            title: "Download complete",
            description: `"${recordingTitle}" is now available offline`,
            variant: "success",
          })

          return 100
        }
        return newProgress
      })
    }, 500)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "relative",
            isDownloading && "pr-10",
            size === "icon" &&
              isDownloading &&
              "after:absolute after:right-2 after:top-2 after:h-2 after:w-2 after:rounded-full after:bg-orange-500 after:animate-pulse",
            className,
          )}
          disabled={isDownloading}
        >
          {size === "icon" ? (
            <Download className="h-4 w-4" />
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download"}
              {isDownloading && size !== "icon" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Download Quality</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => startDownload("HD (1080p)")}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center">
              <span>HD (1080p)</span>
              <span className="ml-2 text-xs text-muted-foreground">~1.2 GB</span>
            </div>
            <Wifi className="h-4 w-4 text-orange-500" />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startDownload("SD (720p)")}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center">
              <span>SD (720p)</span>
              <span className="ml-2 text-xs text-muted-foreground">~700 MB</span>
            </div>
            <Wifi className="h-4 w-4 text-orange-500 opacity-70" />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startDownload("Low (480p)")}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center">
              <span>Low (480p)</span>
              <span className="ml-2 text-xs text-muted-foreground">~350 MB</span>
            </div>
            <Wifi className="h-4 w-4 text-orange-500 opacity-40" />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startDownload("Audio only")}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center">
              <span>Audio only</span>
              <span className="ml-2 text-xs text-muted-foreground">~80 MB</span>
            </div>
            <Wifi className="h-4 w-4 text-orange-500 opacity-20" />
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
