"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import StreamInfo from "@/components/stream-info"
import StreamProducts from "@/components/stream-products"
import LiveChat from "@/components/live-chat"
import AIHighlights from "@/components/ai-highlights"
import LivePolls from "@/components/live-polls"
import { Info, ShoppingBag, MessageSquare, Sparkles, BarChart3 } from "lucide-react"

export default function MobileStreamTabs() {
  const [activeTab, setActiveTab] = useState("info")

  // For demo purposes, hardcoded values
  const streamId = "tech-showcase-2025"
  const streamTitle = "Tech Showcase 2025: The Future of AI"

  return (
    <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="info" className="flex items-center gap-1">
          <Info className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Info</span>
        </TabsTrigger>
        <TabsTrigger value="products" className="flex items-center gap-1">
          <ShoppingBag className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Products</span>
        </TabsTrigger>
        <TabsTrigger value="chat" className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Chat</span>
        </TabsTrigger>
        <TabsTrigger value="polls" className="flex items-center gap-1">
          <BarChart3 className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Polls</span>
        </TabsTrigger>
        <TabsTrigger value="highlights" className="flex items-center gap-1">
          <Sparkles className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Highlights</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="info" className="mt-4">
        <StreamInfo streamId={streamId} />
      </TabsContent>
      <TabsContent value="products" className="mt-4">
        <StreamProducts streamId={streamId} />
      </TabsContent>
      <TabsContent value="chat" className="mt-4">
        <LiveChat streamId={streamId} />
      </TabsContent>
      <TabsContent value="polls" className="mt-4">
        <LivePolls streamId={streamId} />
      </TabsContent>
      <TabsContent value="highlights" className="mt-4">
        <AIHighlights streamId={streamId} streamTitle={streamTitle} />
      </TabsContent>
    </Tabs>
  )
}
