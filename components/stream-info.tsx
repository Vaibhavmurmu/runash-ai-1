import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Share2, Flag } from "lucide-react"

interface StreamInfoProps {
  streamId: string
}

export default function StreamInfo({ streamId }: StreamInfoProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Tech Showcase 2025: The Future of AI</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
            <Flag className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground">
        Join us for an exclusive look at the latest AI-powered gadgets and innovations that will shape the future of
        technology. Our experts will demonstrate cutting-edge products and answer your questions live.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" />
            <AvatarFallback className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              TC
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">TechConnect</span>
              <Badge variant="outline" className="text-xs">
                Verified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">245K followers</p>
          </div>
        </div>

        <Button className="ml-auto bg-orange-500 hover:bg-orange-600">Follow</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800">
          #TechShowcase
        </Badge>
        <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800">
          #AI
        </Badge>
        <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800">
          #SmartHome
        </Badge>
        <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800">
          #FutureTech
        </Badge>
      </div>
    </div>
  )
}
