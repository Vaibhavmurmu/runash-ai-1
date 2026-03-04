"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAnalytics } from "@/components/analytics-provider"
import { Share2, Copy, Facebook, Twitter, Linkedin, Mail, MessageCircle, ChevronDown } from "lucide-react"
import Image from "next/image"

interface SocialShareProps {
  title: string
  description?: string
  url: string
  image?: string
  variant?: "button" | "icon" | "dropdown"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export default function SocialShare({
  title,
  description = "",
  url,
  image = "",
  variant = "button",
  size = "default",
  className = "",
}: SocialShareProps) {
  const [open, setOpen] = useState(false)
  const [customMessage, setCustomMessage] = useState("")
  const { toast } = useToast()
  const { trackEvent } = useAnalytics()

  // Ensure URL is absolute
  const shareUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`

  // Prepare share URLs
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}

${shareUrl}`)}`,
  }

  // Handle share click
  const handleShare = (platform: string) => {
    trackEvent("share", { platform, url: shareUrl, title })

    if (platform === "copy") {
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied",
        description: "The link has been copied to your clipboard",
      })
      return
    }

    if (platform === "custom") {
      // In a real app, this would send the custom message via the selected platform
      toast({
        title: "Message shared",
        description: "Your custom message has been shared",
      })
      setOpen(false)
      return
    }

    // Open share URL in new window
    window.open(shareUrls[platform as keyof typeof shareUrls], "_blank")
  }

  // Native share API (mobile devices)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        })

        trackEvent("share", { platform: "native", url: shareUrl, title })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      setOpen(true)
    }
  }

  // Render based on variant
  if (variant === "icon") {
    return (
      <>
        <Button variant="ghost" size="icon" className={className} onClick={handleNativeShare} aria-label="Share">
          <Share2 className="h-4 w-4" />
        </Button>
        <ShareDialog
          open={open}
          setOpen={setOpen}
          title={title}
          description={description}
          url={shareUrl}
          image={image}
          customMessage={customMessage}
          setCustomMessage={setCustomMessage}
          handleShare={handleShare}
        />
      </>
    )
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} className={className}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleShare("facebook")}>
            <Facebook className="mr-2 h-4 w-4 text-blue-600" />
            Facebook
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare("twitter")}>
            <Twitter className="mr-2 h-4 w-4 text-blue-400" />
            Twitter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare("linkedin")}>
            <Linkedin className="mr-2 h-4 w-4 text-blue-700" />
            LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare("email")}>
            <Mail className="mr-2 h-4 w-4 text-gray-600" />
            Email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare("copy")}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Custom Message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Default button variant
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size={size} className={className} onClick={handleNativeShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </DialogTrigger>
      </Dialog>
      <ShareDialog
        open={open}
        setOpen={setOpen}
        title={title}
        description={description}
        url={shareUrl}
        image={image}
        customMessage={customMessage}
        setCustomMessage={setCustomMessage}
        handleShare={handleShare}
      />
    </>
  )
}

// Share dialog component
function ShareDialog({
  open,
  setOpen,
  title,
  description,
  url,
  image,
  customMessage,
  setCustomMessage,
  handleShare,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  description: string
  url: string
  image: string
  customMessage: string
  setCustomMessage: (message: string) => void
  handleShare: (platform: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
          <DialogDescription>Share this content with your friends and followers</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="social" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="custom">Custom Message</TabsTrigger>
          </TabsList>
          <TabsContent value="social" className="mt-4">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  onClick={() => handleShare("facebook")}
                >
                  <Facebook className="mr-2 h-4 w-4" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-blue-50 text-blue-400 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  onClick={() => handleShare("twitter")}
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  Twitter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  onClick={() => handleShare("linkedin")}
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleShare("email")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </div>
              <div className="relative mt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or copy link</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="grid flex-1 gap-2">
                  <Input id="link" value={url} readOnly className="h-9" />
                </div>
                <Button size="sm" className="px-3" onClick={() => handleShare("copy")}>
                  <span className="sr-only">Copy</span>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="custom" className="mt-4 space-y-4">
            {image && (
              <div className="rounded-lg border p-2">
                <div className="aspect-video w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={title}
                    width={400}
                    height={225}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">{title}</h3>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
              <p className="text-xs text-blue-600 dark:text-blue-400">{url}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Your message</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => handleShare("custom")}>
              Share with message
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </label>
  )
}
