"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Zap, Shield, Users, Sparkles, Layers, Globe, Cpu, Gauge } from "lucide-react"
import FeatureCard from "@/components/feature-card"
import FeatureShowcase from "@/components/feature-showcase"
import FeatureVideo from "@/components/feature-video"
import FeatureExplorer from "@/components/feature-explorer"
import FaqItem from "@/components/faq-item"
import IntegrationCard from "@/components/integration-card"
import ThemeToggle from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-950 dark:via-orange-950/30 dark:to-gray-950"></div>

        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-10 left-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-40 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 dark:opacity-10"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-6 px-6 py-2 border border-orange-500/30 rounded-full bg-orange-500/10 backdrop-blur-sm">
              <span className="text-orange-600 dark:text-orange-400">Powerful AI Features</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Transform Your Streams with RunAsh AI
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              Discover how our cutting-edge AI technology enhances every aspect of your live streaming experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
              >
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50"
              >
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-orange-200 dark:border-orange-900/30 py-4">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-orange-100/50 dark:bg-orange-900/20">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="demos">Demo Videos</TabsTrigger>
              <TabsTrigger value="explorer">Feature Explorer</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>

            {/* Key Features Overview */}
            <TabsContent value="overview">
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                      Key Features
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      Our AI-powered platform offers a comprehensive suite of features designed to elevate your
                      streaming experience.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                      icon={<Zap className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                      title="Real-time Enhancement"
                      description="AI-powered video and audio enhancement that works in real-time with minimal latency."
                      gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                    />
                    <FeatureCard
                      icon={<Shield className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                      title="Content Protection"
                      description="Automatic content moderation and protection to keep your streams safe and compliant."
                      gradient="from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400"
                    />
                    <FeatureCard
                      icon={<Users className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                      title="Audience Engagement"
                      description="Smart tools to boost viewer interaction and grow your community."
                      gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                    />
                    <FeatureCard
                      icon={<Sparkles className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                      title="Virtual Effects"
                      description="AI-generated backgrounds, overlays, and visual effects without green screens."
                      gradient="from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400"
                    />
                    <FeatureCard
                      icon={<Layers className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                      title="Multi-platform Streaming"
                      description="Stream to multiple platforms simultaneously with optimized quality for each."
                      gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                    />
                    <FeatureCard
                      icon={<Globe className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                      title="Live Translation"
                      description="Real-time caption translation to reach global audiences in their native languages."
                      gradient="from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400"
                    />
                  </div>
                </div>
              </section>

              {/* Feature Showcase: AI Enhancement */}
              <section className="py-20 bg-gradient-to-b from-white via-orange-50/50 to-white dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950 relative">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5"></div>
                <div className="container mx-auto px-4">
                  <FeatureShowcase
                    title="AI Video Enhancement"
                    description="Our advanced neural networks analyze and enhance your video in real-time, improving quality even in challenging lighting conditions."
                    image="/real%20time%20video%20processing.webp"
                    imageAlt="RunAsh real-time video processing dashboard improving stream quality"
                    features={[
                      "Automatic lighting correction",
                      "Background noise reduction",
                      "Dynamic resolution upscaling",
                      "Bandwidth optimization",
                      "Skin tone preservation",
                    ]}
                    icon={<Cpu className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                    gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                    direction="right"
                  />
                </div>
              </section>

              {/* Feature Showcase: Content Protection */}
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <FeatureShowcase
                    title="Smart Content Protection"
                    description="Keep your streams safe and compliant with our AI-powered content moderation system that works in real-time."
                    image="/runash%20ai.webp"
                    imageAlt="RunAsh AI moderation panel detecting unsafe content during a live stream"
                    features={[
                      "Automatic content moderation",
                      "Inappropriate content detection",
                      "Copyright infringement prevention",
                      "Customizable moderation settings",
                      "Detailed moderation reports",
                    ]}
                    icon={<Shield className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                    gradient="from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400"
                    direction="left"
                  />
                </div>
              </section>

              {/* Feature Showcase: Audience Engagement */}
              <section className="py-20 bg-gradient-to-b from-white via-orange-50/50 to-white dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950 relative">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5"></div>
                <div className="container mx-auto px-4">
                  <FeatureShowcase
                    title="AI-Powered Audience Engagement"
                    description="Boost viewer interaction and grow your community with smart engagement tools that analyze chat and viewer behavior."
                    image="/runash%20live%20shopping.webp"
                    imageAlt="Audience engagement analytics with live shopping interactions"
                    features={[
                      "Smart chat moderation",
                      "Automated highlight clips",
                      "Viewer sentiment analysis",
                      "Interactive polls and quizzes",
                      "Personalized viewer interactions",
                    ]}
                    icon={<Users className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                    gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                    direction="right"
                  />
                </div>
              </section>

              {/* Feature Showcase: Performance Optimization */}
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <FeatureShowcase
                    title="Performance Optimization"
                    description="Our platform automatically optimizes your stream for maximum quality and stability, regardless of your internet connection."
                    image="/runash%20studio.webp"
                    imageAlt="RunAsh Studio performance optimization controls for adaptive streaming"
                    features={[
                      "Adaptive bitrate streaming",
                      "Network condition detection",
                      "Automatic quality adjustment",
                      "Low-latency streaming",
                      "Bandwidth usage optimization",
                    ]}
                    icon={<Gauge className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
                    gradient="from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400"
                    direction="left"
                  />
                </div>
              </section>
            </TabsContent>

            {/* Feature Demo Videos */}
            <TabsContent value="demos">
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                      Feature Demo Videos
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      See our AI-powered features in action with these demonstration videos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FeatureVideo
                      title="AI Video Enhancement"
                      description="Watch how our AI instantly improves video quality in challenging lighting conditions."
                      videoThumbnail="/real%20time%20video%20processing.webp"
                      duration="2:45"
                    />
                    <FeatureVideo
                      title="Virtual Backgrounds"
                      description="See how our AI creates professional virtual backgrounds without a green screen."
                      videoThumbnail="/futuristic-ai-video-background.jpg"
                      duration="3:12"
                    />
                    <FeatureVideo
                      title="Multi-platform Streaming"
                      description="Learn how to stream to multiple platforms simultaneously with optimized settings."
                      videoThumbnail="/multi%20platform%20streaming.webp"
                      duration="4:30"
                    />
                    <FeatureVideo
                      title="Live Translation"
                      description="Watch our real-time caption translation in action, reaching global audiences."
                      videoThumbnail="/runash%20live.webp"
                      duration="2:18"
                    />
                  </div>

                  <div className="mt-12 text-center">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
                    >
                      View All Tutorials <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* Interactive Feature Explorer */}
            <TabsContent value="explorer">
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                      Interactive Feature Explorer
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      Explore our features interactively and see how they can transform your streaming experience.
                    </p>
                  </div>

                  <FeatureExplorer />
                </div>
              </section>
            </TabsContent>

            {/* Integration Showcase */}
            <TabsContent value="integrations">
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                      Integration Showcase
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      RunAsh AI seamlessly integrates with your favorite platforms and tools.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <IntegrationCard
                      name="Twitch"
                      description="Stream directly to Twitch with enhanced video quality and smart chat moderation."
                      icon="/logo.png"
                      iconAlt="RunAsh integration icon for Twitch"
                      gradient="from-purple-500 to-purple-700"
                    />
                    <IntegrationCard
                      name="YouTube"
                      description="Reach your YouTube audience with AI-enhanced streams and automatic highlight clips."
                      icon="/runashlogo.jpg"
                      iconAlt="RunAsh integration icon for YouTube"
                      gradient="from-red-500 to-red-700"
                    />
                    <IntegrationCard
                      name="Discord"
                      description="Connect your Discord community with stream notifications and interactive features."
                      icon="/RunAshChat.png"
                      iconAlt="RunAsh integration icon for Discord"
                      gradient="from-indigo-500 to-indigo-700"
                    />
                    <IntegrationCard
                      name="OBS Studio"
                      description="Enhance your OBS workflow with our plugin for real-time AI video processing."
                      icon="/runash%20studio.webp"
                      iconAlt="RunAsh integration icon for OBS Studio"
                      gradient="from-blue-500 to-blue-700"
                    />
                    <IntegrationCard
                      name="Streamlabs"
                      description="Integrate with Streamlabs for enhanced alerts and donation features."
                      icon="/runash%20organic.webp"
                      iconAlt="RunAsh integration icon for Streamlabs"
                      gradient="from-green-500 to-green-700"
                    />
                    <IntegrationCard
                      name="TikTok Live"
                      description="Stream to TikTok Live with vertical video optimization and engagement tools."
                      icon="/runash%20live%20selling.webp"
                      iconAlt="RunAsh integration icon for TikTok Live"
                      gradient="from-black to-gray-800"
                    />
                  </div>

                  <div className="mt-16 p-8 rounded-xl bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border border-orange-200 dark:border-orange-800/30">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold mb-4 text-orange-800 dark:text-orange-300">
                        API & Developer Tools
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Build custom integrations with our comprehensive API and developer tools.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                        <h4 className="font-bold mb-2 text-orange-600 dark:text-orange-400">RESTful API</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Access all RunAsh features programmatically with our well-documented API.
                        </p>
                      </div>
                      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                        <h4 className="font-bold mb-2 text-orange-600 dark:text-orange-400">Webhooks</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Get real-time notifications for stream events and viewer interactions.
                        </p>
                      </div>
                      <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                        <h4 className="font-bold mb-2 text-orange-600 dark:text-orange-400">SDK</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Integrate RunAsh AI into your own applications with our developer kit.
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <Button
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50"
                      >
                        View Developer Documentation
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* Features FAQ */}
            <TabsContent value="faq">
              <section className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                  <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                      Frequently Asked Questions
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      Find answers to common questions about our features and how they work.
                    </p>
                  </div>

                  <div className="max-w-3xl mx-auto space-y-6">
                    <FaqItem
                      question="How does the AI video enhancement work?"
                      answer="Our AI video enhancement uses deep learning models trained on millions of video frames to analyze and improve your video in real-time. It adjusts lighting, reduces noise, enhances details, and optimizes colors without requiring any technical knowledge from you."
                    />
                    <FaqItem
                      question="Do I need special hardware to use RunAsh AI?"
                      answer="No, RunAsh AI works with standard streaming equipment. For basic streaming, you'll need a computer with a modern web browser, a webcam, and a microphone. Our AI processing happens in the cloud, so you don't need a powerful computer."
                    />
                    <FaqItem
                      question="How accurate is the live translation feature?"
                      answer="Our live translation feature achieves over 95% accuracy for most major languages. It uses context-aware neural machine translation to provide natural-sounding translations that maintain the meaning of your content."
                    />
                    <FaqItem
                      question="Can I use virtual backgrounds without a green screen?"
                      answer="Yes! Our AI-powered virtual background feature uses advanced segmentation algorithms to separate you from your background without requiring a green screen. It works best in well-lit environments with some contrast between you and your background."
                    />
                    <FaqItem
                      question="How does multi-platform streaming affect my internet bandwidth?"
                      answer="Our intelligent stream distribution system optimizes your stream for each platform while minimizing bandwidth usage. Instead of sending multiple high-quality streams from your computer, we send one stream to our servers, which then distribute optimized versions to each platform."
                    />
                    <FaqItem
                      question="Is my content safe with RunAsh AI's content moderation?"
                      answer="Yes, our content moderation system is designed to protect creators while respecting creative freedom. It helps you comply with platform guidelines by alerting you to potentially problematic content before it causes issues. All processing happens in real-time and you maintain full control over moderation settings."
                    />
                  </div>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/70 via-yellow-100/70 to-orange-100/70 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-orange-900/30"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-10"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-white/80 to-orange-50/80 dark:from-gray-900/80 dark:to-orange-950/80 border border-orange-200/50 dark:border-orange-800/30 rounded-2xl p-8 md:p-12 backdrop-blur-sm shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                Ready to Transform Your Streams?
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg max-w-2xl mx-auto">
                Join thousands of content creators who are already using RunAsh AI to create stunning live streams.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
              >
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50"
              >
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-gray-950 border-t border-orange-200/50 dark:border-orange-900/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 text-transparent bg-clip-text">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/about"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="/careers"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="/press"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Press
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 text-transparent bg-clip-text">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/features"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="/pricing"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="/integrations"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 text-transparent bg-clip-text">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/docs"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="/tutorials"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="/brand"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Brand Assets
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 text-transparent bg-clip-text">
                Connect
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/contact"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500">
            <p>© {new Date().getFullYear()} RunAsh AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
