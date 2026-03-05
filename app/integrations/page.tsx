"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Check, ExternalLink, Search, Star, Zap } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type IntegrationStatus = "connected" | "available" | "coming-soon"

type Integration = {
  name: string
  description: string
  icon: string
  category: string
  status: IntegrationStatus
  featured?: boolean
}

const IntegrationCard = ({
  name,
  description,
  icon,
  category,
  status,
  featured = false,
  comingSoon = false,
  href,
  external = false,
}: {
  name: string
  description: string
  icon: string
  category: string
  status: IntegrationStatus
  featured?: boolean
  comingSoon?: boolean
  href?: string
  external?: boolean
}) => {
  const actionLabel = status === "connected" ? "Configure" : status === "coming-soon" ? "Coming Soon" : "Connect"

  const buttonClassName =
    status === "connected"
      ? "border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50"
      : status === "coming-soon"
        ? "opacity-50 cursor-not-allowed"
        : "bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"

  return (
    <Card
      className={`${featured ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20" : "border-orange-200/50 dark:border-orange-900/30"} hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all duration-300`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <img src={icon || "/placeholder.svg"} alt={name} className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{name}</h3>
              <Badge variant="outline" className="text-xs mt-1">
                {category}
              </Badge>
            </div>
          </div>
          {featured && (
            <Badge className="bg-yellow-500 text-black">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "connected" && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
            {status === "coming-soon" && <Badge variant="secondary">Coming Soon</Badge>}
          </div>

          {href && status !== "coming-soon" ? (
            <Button size="sm" variant={status === "connected" ? "outline" : "default"} className={buttonClassName} asChild>
              <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
                {actionLabel}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          ) : (
            <Button
              size="sm"
              variant={status === "connected" ? "outline" : "default"}
              className={buttonClassName}
              disabled={status === "coming-soon"}
            >
              {actionLabel}
              {status !== "coming-soon" && <ExternalLink className="ml-1 h-3 w-3" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const allIntegrations: Integration[] = [
    {
      name: "Twitch",
      description: "Stream directly to Twitch with enhanced video quality and smart chat moderation.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Streaming Platform",
      status: "connected",
      featured: true,
    },
    {
      name: "YouTube",
      description: "Reach your YouTube audience with AI-enhanced streams and automatic highlight clips.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Streaming Platform",
      status: "available",
      featured: true,
    },
    {
      name: "OBS Studio",
      description: "Enhance your OBS workflow with our plugin for real-time AI video processing.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Creator Tool",
      status: "available",
      featured: true,
    },
    {
      name: "Discord",
      description: "Connect your Discord community with stream notifications and interactive features.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Social Media",
      status: "available",
    },
    {
      name: "Streamlabs",
      description: "Integrate with Streamlabs for enhanced alerts and donation features.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Creator Tool",
      status: "available",
    },
    {
      name: "TikTok Live",
      description: "Stream to TikTok Live with vertical video optimization and engagement tools.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Streaming Platform",
      status: "available",
    },
    {
      name: "Facebook Live",
      description: "Broadcast to Facebook with AI-powered audience engagement features.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Streaming Platform",
      status: "available",
    },
    {
      name: "Instagram Live",
      description: "Go live on Instagram with professional quality and AI enhancements.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Streaming Platform",
      status: "available",
    },
    {
      name: "Spotify",
      description: "Display your currently playing music and integrate with your stream overlay.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Music",
      status: "available",
    },
    {
      name: "Google Analytics",
      description: "Track your streaming performance with detailed analytics and insights.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Analytics",
      status: "available",
    },
    {
      name: "Zapier",
      description: "Automate your workflow by connecting RunAsh with thousands of other apps.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Automation",
      status: "available",
    },
    {
      name: "Slack",
      description: "Get stream notifications and manage your team communication.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Communication",
      status: "coming-soon",
    },
    {
      name: "Twitter",
      description: "Auto-tweet when you go live and share highlights with your followers.",
      icon: "/placeholder.svg?height=32&width=32",
      category: "Social Media",
      status: "coming-soon",
    },
  ]

  const featuredIntegrations = allIntegrations.filter((integration) => integration.featured)
  const streamingIntegrations = allIntegrations.filter((integration) => integration.category === "Streaming Platform")
  const toolsIntegrations = allIntegrations.filter((integration) => integration.category === "Creator Tool")
  const socialIntegrations = allIntegrations.filter((integration) => integration.category === "Social Media")
  const analyticsIntegrations = allIntegrations.filter((integration) => integration.category === "Analytics")

  const filterIntegrations = (integrations: Integration[]) => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return integrations
    }

    return integrations.filter(({ name, category, description }) =>
      [name, category, description].some((field) => field.toLowerCase().includes(normalizedQuery)),
    )
  }

  const renderIntegrationGrid = (integrations: Integration[], emptyStateLabel: string) => {
    if (!integrations.length) {
      return (
        <div className="rounded-lg border border-dashed border-orange-300/70 dark:border-orange-800/70 p-8 text-center text-gray-600 dark:text-gray-300">
          No integrations match “{searchQuery}” in {emptyStateLabel}.
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.name}
            name={integration.name}
            description={integration.description}
            icon={integration.icon}
            category={integration.category}
            status={integration.status}
            featured={integration.featured}
          />
        ))}
      </div>
    )
  }

  const filteredFeaturedIntegrations = filterIntegrations(featuredIntegrations)
  const filteredAllIntegrations = filterIntegrations(allIntegrations)
  const filteredStreamingIntegrations = filterIntegrations(streamingIntegrations)
  const filteredToolsIntegrations = filterIntegrations(toolsIntegrations)
  const filteredSocialIntegrations = filterIntegrations(socialIntegrations)
  const filteredAnalyticsIntegrations = filterIntegrations(analyticsIntegrations)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-950 dark:via-orange-950/30 dark:to-gray-950"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 dark:opacity-10"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-6 px-6 py-2 border border-orange-500/30 rounded-full bg-orange-500/10 backdrop-blur-sm">
              <span className="text-orange-600 dark:text-orange-400">Integrations</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Connect Everything
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              Integrate RunAsh AI with your favorite platforms and tools to create a seamless streaming workflow.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 dark:bg-gray-900/50 border-orange-200 dark:border-orange-800/30 focus:border-orange-500/70"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Integration Content */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="all" className="mb-8">
              <TabsList className="bg-orange-100/50 dark:bg-orange-900/20">
                <TabsTrigger value="all">All Integrations</TabsTrigger>
                <TabsTrigger value="streaming">Streaming Platforms</TabsTrigger>
                <TabsTrigger value="tools">Creator Tools</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-8 space-y-12">
                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Featured Integrations</h2>
                  {renderIntegrationGrid(filteredFeaturedIntegrations, "Featured Integrations")}
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">All Integrations</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <IntegrationCard
                      name="Discord"
                      description="Connect your Discord community with stream notifications and interactive features."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Social Media"
                      status="available"
                    />
                    <IntegrationCard
                      name="Streamlabs"
                      description="Integrate with Streamlabs for enhanced alerts and donation features."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Creator Tool"
                      status="available"
                    />
                    <IntegrationCard
                      name="Hugging Face"
                      description="Sync models and datasets from Hugging Face directly into your RunAsh workflows."
                      icon="/integrations/huggingface.svg"
                      category="AI Platform"
                      status="available"
                    />
                    <IntegrationCard
                      name="Google Colab"
                      description="Launch notebooks in Google Colab and connect trained outputs back to your stream tooling."
                      icon="/integrations/colab.svg"
                      category="Developer Tool"
                      status="available"
                    />
                    <IntegrationCard
                      name="Kaggle"
                      description="Integrate Kaggle models and competitions data for rapid experimentation and deployment."
                      icon="/integrations/kaggle.svg"
                      category="AI Platform"
                      status="available"
                    />
                    <IntegrationCard
                      name="TikTok Live"
                      description="Stream to TikTok Live with vertical video optimization and engagement tools."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Streaming Platform"
                      status="available"
                    />
                    <IntegrationCard
                      name="Facebook Live"
                      description="Broadcast to Facebook with AI-powered audience engagement features."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Streaming Platform"
                      status="available"
                    />
                    <IntegrationCard
                      name="Instagram Live"
                      description="Go live on Instagram with professional quality and AI enhancements."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Streaming Platform"
                      status="available"
                    />
                    <IntegrationCard
                      name="Spotify"
                      description="Display your currently playing music and integrate with your stream overlay."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Music"
                      status="available"
                    />
                    <IntegrationCard
                      name="Google Analytics"
                      description="Track your streaming performance with detailed analytics and insights."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Analytics"
                      status="available"
                    />
                    <IntegrationCard
                      name="Zapier"
                      description="Automate your workflow by connecting RunAsh with thousands of other apps."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Automation"
                      status="available"
                    />
                    <IntegrationCard
                      name="Hugging Face"
                      description="Access state-of-the-art models and share community demos for your AI-powered workflows."
                      icon="/placeholder.svg?height=32&width=32"
                      category="AI Platform"
                      status="available"
                      href="https://huggingface.co"
                      external={true}
                    />
                    <IntegrationCard
                      name="Google Colab"
                      description="Prototype and run notebooks in the cloud for rapid experimentation and model tuning."
                      icon="/placeholder.svg?height=32&width=32"
                      category="AI Platform"
                      status="available"
                      href="https://colab.research.google.com"
                      external={true}
                    />
                    <IntegrationCard
                      name="Kaggle"
                      description="Leverage datasets, competitions, and notebooks to benchmark and improve your models."
                      icon="/placeholder.svg?height=32&width=32"
                      category="AI Platform"
                      status="available"
                      href="https://www.kaggle.com"
                      external={true}
                    />
                    <IntegrationCard
                      name="Slack"
                      description="Get stream notifications and manage your team communication."
                      icon="/placeholder.svg?height=32&width=32"
                      category="Communication"
                      status="coming-soon"
                      comingSoon={true}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="streaming" className="mt-8">
                {renderIntegrationGrid(filteredStreamingIntegrations, "Streaming Platforms")}
              </TabsContent>

              <TabsContent value="tools" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <IntegrationCard
                    name="OBS Studio"
                    description="Enhance your OBS workflow with our plugin for real-time AI video processing."
                    icon="/placeholder.svg?height=32&width=32"
                    category="Creator Tool"
                    status="available"
                    featured={true}
                  />
                  <IntegrationCard
                    name="Streamlabs"
                    description="Integrate with Streamlabs for enhanced alerts and donation features."
                    icon="/placeholder.svg?height=32&width=32"
                    category="Creator Tool"
                    status="available"
                  />
                  <IntegrationCard
                    name="Hugging Face"
                    description="Access state-of-the-art models and share community demos for your AI-powered workflows."
                    icon="/placeholder.svg?height=32&width=32"
                    category="AI Platform"
                    status="available"
                    href="https://huggingface.co"
                    external={true}
                  />
                  <IntegrationCard
                    name="Google Colab"
                    description="Prototype and run notebooks in the cloud for rapid experimentation and model tuning."
                    icon="/placeholder.svg?height=32&width=32"
                    category="AI Platform"
                    status="available"
                    href="https://colab.research.google.com"
                    external={true}
                  />
                  <IntegrationCard
                    name="Kaggle"
                    description="Leverage datasets, competitions, and notebooks to benchmark and improve your models."
                    icon="/placeholder.svg?height=32&width=32"
                    category="AI Platform"
                    status="available"
                    href="https://www.kaggle.com"
                    external={true}
                  />
                </div>
              </TabsContent>

              <TabsContent value="social" className="mt-8">
                {renderIntegrationGrid(filteredSocialIntegrations, "Social Media")}
              </TabsContent>

              <TabsContent value="analytics" className="mt-8">
                {renderIntegrationGrid(filteredAnalyticsIntegrations, "Analytics")}
              </TabsContent>
            </Tabs>

            {/* Build Custom Integrations */}
            <div className="mt-16 p-8 rounded-xl bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border border-orange-200 dark:border-orange-800/30">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400 mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-orange-800 dark:text-orange-300">
                  Build Custom Integrations
                </h3>
                <p className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
                  Use our integration toolkit to connect RunAsh AI with your internal stack, automate workflows, and
                  ship production-ready features quickly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-orange-100 dark:border-orange-900/30">
                  <h4 className="font-bold mb-2 text-orange-600 dark:text-orange-400">RESTful API</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Access projects, streams, analytics, and automation endpoints with token-based authentication.
                  </p>
                  <Button size="sm" variant="outline" className="border-orange-300 dark:border-orange-700">
                    Integrate API <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-orange-100 dark:border-orange-900/30">
                  <h4 className="font-bold mb-2 text-orange-600 dark:text-orange-400">Webhooks</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Trigger real-time automations from stream, payout, moderation, and engagement events.
                  </p>
                  <Button size="sm" variant="outline" className="border-orange-300 dark:border-orange-700">
                    Configure Webhooks <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-orange-100 dark:border-orange-900/30">
                  <h4 className="font-bold mb-2 text-orange-600 dark:text-orange-400">SDKs</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Start faster using official SDKs for JavaScript, Python, and server-side integrations.
                  </p>
                  <Button size="sm" variant="outline" className="border-orange-300 dark:border-orange-700">
                    Explore SDKs <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white">
                  API Documentation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" className="border-orange-400 text-orange-700 dark:text-orange-300">
                  Integrate Now <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Integration Roadmap */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-orange-200/60 dark:border-orange-900/40">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-2">Remaining Features</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enterprise SSO, role-based access, integration health checks, and usage quotas are next in the
                    integration roadmap.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-orange-200/60 dark:border-orange-900/40">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-2">Need an Integration?</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tell us which platform you want next and we will prioritize it in upcoming releases.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-gray-950 border-t border-orange-200/50 dark:border-orange-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500">
            <p>© {new Date().getFullYear()} RunAsh AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
