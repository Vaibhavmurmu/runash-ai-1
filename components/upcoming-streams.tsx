import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Calendar } from "lucide-react"

export default function UpcomingStreams() {
  const streams = [
    {
      id: 1,
      title: "Smart Home Automation Workshop",
      host: "HomeConnect",
      hostInitials: "HC",
      date: "May 5, 2025",
      time: "2:00 PM EST",
      image: "/placeholder.svg?height=120&width=200",
    },
    {
      id: 2,
      title: "Gaming Peripherals Showcase",
      host: "GamersHub",
      hostInitials: "GH",
      date: "May 7, 2025",
      time: "7:00 PM EST",
      image: "/placeholder.svg?height=120&width=200",
    },
    {
      id: 3,
      title: "Wearable Tech Trends 2025",
      host: "TechStyle",
      hostInitials: "TS",
      date: "May 10, 2025",
      time: "1:00 PM EST",
      image: "/placeholder.svg?height=120&width=200",
    },
  ]

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {streams.map((stream) => (
        <Card key={stream.id} className="overflow-hidden">
          <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-800">
            <img src={stream.image || "/placeholder.svg"} alt={stream.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{stream.date}</span>
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-2 text-white">
              <span className="text-sm">{stream.time}</span>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="/placeholder.svg?height=24&width=24" />
                  <AvatarFallback className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                    {stream.hostInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{stream.host}</span>
              </div>
              <Badge variant="outline" className="border-orange-500 text-orange-500">
                Upcoming
              </Badge>
            </div>
            <h3 className="mb-3 font-medium">{stream.title}</h3>
            <Button variant="outline" className="w-full">
              <Bell className="mr-2 h-4 w-4" /> Remind Me
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
