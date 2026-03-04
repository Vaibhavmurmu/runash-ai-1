"use client"

import { Play } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface FeatureVideoProps {
  title: string
  description: string
  videoThumbnail: string
  duration: string
  videoUrl: string
  embedUrl?: string
  openInNewTab?: boolean
}

interface VideoCardContentProps {
  title: string
  description: string
  videoThumbnail: string
  duration: string
}

function VideoCardContent({ title, description, videoThumbnail, duration }: VideoCardContentProps) {
  return (
    <>
      {/* Video thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden">
        <img
          src={videoThumbnail || "/placeholder.svg"}
          alt={`${title} video thumbnail preview`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-orange-600/90 dark:bg-orange-500/90 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Play className="h-8 w-8 text-white ml-1" aria-hidden="true" />
          </div>
        </div>

        {/* Duration */}
        <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/70 rounded-md text-white text-xs">{duration}</div>
      </div>

      {/* Video info */}
      <div className="mt-4 text-left">
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </>
  )
}

export default function FeatureVideo({
  title,
  description,
  videoThumbnail,
  duration,
  videoUrl,
  embedUrl,
  openInNewTab = true,
}: FeatureVideoProps) {
  const triggerClasses =
    "group relative rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"

  if (embedUrl) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className={triggerClasses} aria-label={`Play demo video: ${title}`}>
            <VideoCardContent title={title} description={description} videoThumbnail={videoThumbnail} duration={duration} />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="aspect-video overflow-hidden rounded-lg border border-orange-200/40 dark:border-orange-900/40">
            <iframe
              src={embedUrl}
              title={`${title} demo video player`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-sm w-fit"
          >
            Open video on source platform
          </a>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <a
      href={videoUrl}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={triggerClasses}
      aria-label={`Open demo video: ${title}`}
    >
      <VideoCardContent title={title} description={description} videoThumbnail={videoThumbnail} duration={duration} />
    </a>
  )
}
