"use client"

import { Button } from "@/components/ui/button"
import Banner from "@/components/banner"
import { Badge } from "@/components/ui/badge"
import { Bell, Play, Zap, Users, Shield, ArrowRight, ChevronRight, Star, BarChart, Globe,SquareArrowDownRight } from "lucide-react"
import VideoBackground from "@/components/video-background"
import FeatureCard from "@/components/feature-card"
import TestimonialCard from "@/components/testimonial-card"
import PricingCard from "@/components/pricing-card"
import Navbar from "@/components/navbar"
import StatCounter from "@/components/stat-counter"
import TechBadge from "@/components/tech-badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/theme-toggle"
import { NewsletterSignup } from "@/components/newsletter-signup"
import { LanguageSelector } from "@/components/language-selector"
import { CountrySelector } from "@/components/country-selector"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"


export default function Home() {
  const router = useRouter()
  const [currency, setCurrency] = useState<"USD" | "INR">("USD")

  const formatPrice = (price: number) => {
    if (currency === "INR") {
      return `₹${(price * 83.25).toLocaleString("en-IN")}`
    }
    return `$${price}`
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-white">
      
      <Navbar />
      <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-block  mt-16 mb-0 px-3 py-3 rounded-full bg-orange-100/80 dark:bg-orange-900/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800/50">
            <div className="flex items-center justify-center space-x-2">
              <Bell className="w-4 h-4" />
              <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">
               🎉 New Live AI Video Generation Model Pre Released!{" "}
               <a href="/blog/new-model" className="underline font-semibold hover:text-orange-200">
                Learn more
              </a>
            </span>
          </div>
            
      </div>
      </div>
       {/* Hero Section with Video Background */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden"> 
        <VideoBackground />
         
         
          
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-block  mb-4 px-3 py-1 rounded-full bg-orange-100/80 dark:bg-orange-900/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800/50">
            <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">
              Introducing RunAsh AI 
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
          The AI Live Streaming Platform 
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            The next generation of AI live streaming platform for creators, sellers, and businesses
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10"
              onClick={() => router.push("/get-started")}
            >
              Start Streaming <Play className="ml-2 h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-white/90 text-orange-700 hover:bg-white">
              <Link href="/waitlist">
                Join Waitlist <Users className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
              onClick={() => router.push("/demo")}
            >
              Watch Demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>     
         {/* Tech badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <TechBadge label="Real-time AI" />
            <TechBadge label="4K Quality" />
            <TechBadge label="Low Latency" />
            <TechBadge label="Multi-platform" />
            <TechBadge label="Upload & Stream" />
          </div>
        </div>
         
        <div className="absolute bottom-10 left-0 right-0 flex justify-center animate-bounce">
          <ChevronRight className="h-8 w-8 transform rotate-90 text-orange-500 dark:text-orange-400" />
        </div>  
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-900 border-y border-orange-100 dark:border-orange-900/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCounter value={1000} label="Active Streamers" suffix="+" />
            <StatCounter value={1000} label="Monthly Viewers" suffix="+" />
            <StatCounter value={99.9} label="Uptime Percentage" suffix="%" />
            <StatCounter value={2} label="Countries Reached" suffix="+" />
          </div>
        </div>
      
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-white to-orange-50 dark:from-gray-900 dark:to-gray-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 backdrop-blur-sm border border-orage-200 dark:border-orange-800/50">
              <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">Powerful Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              AI Streaming Tools
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Unlock the full potential of your content with our cutting-edge AI features designed for modern creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="h-6 w-6 text-white" />}
              title="AI-Enhanced Streaming"
              description="Automatically enhance your video quality, reduce noise, and optimize bandwidth in real-time with our proprietary AI algorithms."
              gradient="from-orange-600 to-yellow-500"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6 text-white" />}
              title="Smart Audience Engagement"
              description="AI-powered chat moderation, sentiment analysis, and audience analytics to boost engagement and grow your community."
              gradient="from-orange-500 to-red-500"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-white" />}
              title="Content Protection"
              description="Advanced AI content monitoring to protect your brand and comply with platform guidelines automatically."
              gradient="from-yellow-500 to-orange-600"
            />
            <FeatureCard
              icon={<BarChart className="h-6 w-6 text-white" />}
              title="Analytics Dashboard"
              description="Comprehensive analytics with AI-driven insights to understand your audience and optimize your content strategy."
              gradient="from-red-500 to-orange-500"
            />
            <FeatureCard
              icon={<Star className="h-6 w-6 text-white" />}
              title="AI Content Suggestions"
              description="Get personalized content recommendations based on your audience preferences and trending topics."
              gradient="from-yellow-400 to-orange-500"
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6 text-white" />}
              title="Multi-platform Streaming"
              description="Stream simultaneously to multiple platforms with optimized settings for each destination."
              gradient="from-orange-600 to-red-600"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-orange-50 dark:bg-gray-950 border-y border-orange-100 dark:border-orange-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800/50">
              <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">Simple Process</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              How RunAsh Works
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Get started in minutes and transform your streaming experience
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/10 dark:shadow-orange-500/5 aspect-video bg-gradient-to-br from-orange-600 to-yellow-500 dark:from-orange-700 dark:to-yellow-600 flex items-center justify-center group relative">
              <div className="absolute inset-0 bg-black/20 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Play className="h-20 w-20 text-white opacity-90 z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="bg-gradient-to-br from-orange-600 to-yellow-500 rounded-full h-12 w-12 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Sign Up & Connect</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Create your account and connect your streaming sources in minutes. Our intuitive setup wizard guides
                    you through the process.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="bg-gradient-to-br from-orange-600 to-yellow-500 rounded-full h-12 w-12 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Customize Your Stream</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Set up AI enhancements, overlays, and engagement tools. Choose from our library of templates or
                    create your own.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="bg-gradient-to-br from-orange-600 to-yellow-500 rounded-full h-12 w-12 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Go Live with AI</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Start streaming with real-time AI enhancements and analytics. Monitor performance and engage with
                    your audience like never before.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800/50">
              <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">Success Stories</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              What Streamers Say
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Join thousands of content creators who have transformed their streaming with RunAsh AI
            </p>
          </div>

          <ScrollArea className="w-full pb-8">
            <div className="flex space-x-6">
              <TestimonialCard
                name="Nirali "
                role="Seller Streamer"
                image="/placeholder.svg?height=80&width=80"
                quote="RunAsh AI has doubled my viewer engagement and made streaming so much easier. The AI enhancements make my stream look professional without expensive equipment."
              />
              <TestimonialCard
                name="Sikander"
                role="Seller Streamer"
                image="/placeholder.svg?height=80&width=80"
                quote="The AI video enhancement makes my organic products streams look professional without expensive equipment. My subscribers have increased by 200% since switching to RunAsh."
              />
              <TestimonialCard
                name="Jassi"
                role="Seller Streamer"
                image="/placeholder.svg?height=80&width=80"
                quote="The audience analytics have helped me tailor my content to what my viewers actually want. The AI content suggestions are spot on and have helped me grow my channel."
              />
              <TestimonialCard
                name="P k Murmu"
                role="Seller Streamer"
                image="/placeholder.svg?height=80&width=80"
                quote="As a seller, audio quality is everything. RunAsh's AI audio enhancement has made my live demonstration sound studio-quality. My fans love it!"
              />
              <TestimonialCard
                name="Sneha"
                role="Cooking Channel Host"
                image="/placeholder.svg?height=80&width=80"
                quote="The multi-camera AI switching is a game-changer for my cooking streams. It's like having a professional director for my channel. Absolutely worth every penny."
              />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </section>
      
      
      {/* Pricing */}
      <section className="py-24 bg-orange-50 dark:bg-gray-950 border-y border-orange-100 dark:border-orange-900/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800/50">
              <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">Flexible Plans</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Select the perfect plan for your streaming needs with no hidden fees
            </p>
            {/* Currency Selector */}
            <div className="flex justify-center mt-4 mb-8">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCurrency("USD")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currency === "USD"
                      ? "bg-orange-500 text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-orange-500"
                  }`}
                >
                 🇺🇸 USD
                </button>
                <button
                  onClick={() => setCurrency("INR")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currency === "INR"
                      ? "bg-orange-500 text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-orange-500"
                  }`}
                >
                  🇮🇳 INR
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard
              title="Starter"
              price={formatPrice(19)}
              features={[
                "720p AI Enhancement",
                "Basic Chat Moderation",
                "5 Hours Monthly Streaming",
                "Standard Support",
                "Single Platform Streaming",
              ]}
              buttonText="Get Started"
              popular={false}
              onButtonClick={() => router.push("/checkout?plan=starter")}
            />
            <PricingCard
              title="Professional"
              price={formatPrice (49)}
              features={[
                "1080p AI Enhancement",
                "Advanced Chat Moderation",
                "50 Hours Monthly Streaming",
                "Priority Support",
                "Custom Overlays",
                "Multi-platform Streaming (2)",
                "Analytics Dashboard",
              ]}
              buttonText="Choose Pro"
              popular={true}
              onButtonClick={() => router.push("/checkout?plan=professional")}
            />
            <PricingCard
              title="Enterprise"
              price={formatPrice (99)}
              features={[
                "4K AI Enhancement",
                "Premium Chat Moderation",
                "Unlimited Streaming",
                "24/7 Support",
                "Custom Branding",
                "Multi-platform Streaming (unlimited)",
                "Advanced Analytics",
                "API Access",
                "Dedicated Account Manager",
              ]}
              buttonText="Contact Sales"
              popular={false}
             onButtonClick={() => router.push("/checkout?plan=enterprise")}
            />
          </div>
        </div>
      </section>
    
      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-orange-600 to-yellow-500 dark:from-orange-700 dark:to-yellow-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Transform Your Streams?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
            Join thousands of content creators who are elevating their streaming with RunAsh AI. Start your free trial 
            today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 shadow-lg shadow-orange-700/20"
             onClick={() => router.push("/get-started")}
             >
              Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-orange-600 hover:bg-orange-600/20"
              onClick={() => router.push("/demo")}
              >
              Schedule a Demo
            </Button>
          </div>
          <p className="mt-6 text-white/80 text-sm">No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-white dark:bg-gray-900 border-t border-orange-100 dark:border-orange-900/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 mb-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <h3 className="font-bold text-xl mb-4 text-gray-900 dark:text-white">RunAsh AI</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
               Runash Digital Innovation Technologies Private Limited.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  <a href="/status" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                    All systems operational
                  </a>
                </span>
              </div>

              {/* Language and Country Selector */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <LanguageSelector />
                <CountrySelector />
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/ai"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    AI
                  </a>
                </li>
                <li>
                  <a
                    href="/live"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Live
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                   RunAshChat
                  </a>
                </li>
                <li>
                  <a
                    href="/become-seller"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Become a seller 
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Products</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/studio"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Studio
                  </a>
                </li>
                <li>
                  <a
                    href="/mobile-ios"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    iOS App 
                  </a>
                </li>
                <li>
                  <a
                    href="/home"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Web App 
                  </a>
                </li>
                <li>
                  <a
                    href="/mobile-android"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Android App 
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/blog"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="/learn"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Learn
                  </a>
                </li>
                <li>
                  <a
                    href="/tutorials"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    href="/docs"
                    className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Documentation 
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter Signup */}
            <div className="lg:col-span-2">
              <NewsletterSignup />

              {/* Social Media */}
              <div className="mt-6">
                <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Follow us</h4>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="https://twitter.com/runash_ai"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-twitter"
                    >
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                    </svg>
                    <span>X</span>
                  </a>
                  <a
                    href="https://discord.com/runash_ai"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-message-circle"
                    >
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                    <span>Join our Discord</span>
                  </a>
                  <a
                    href="https://youtube.com/runash_ai"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-youtube"
                    >
                      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                      <path d="m10 15 5-3-5-3z" />
                    </svg>
                    <span>YouTube</span>
                  </a>
                  <a
                    href="https://instagram.com/runash_ai"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-instagram"
                    >
                      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Sitemap */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white"></h3>
             <p className="text-gray-600 dark:text-gray-400 mb-4">
                
              </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Company</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/about"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      About
                    </a>
                  </li>
                  <li>
                    <a
                      href="/contact"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Contact 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/careers"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Careers 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300"> AI Products</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      AI Assistant 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/live-selling"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Live Selling 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/live-commerce"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Live Shopping 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Community</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/https://github.com/runash-ai"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://x.com/runash_ai"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     X/Twitter 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/https://Huggingface.com/runash-ai"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Hugging Face 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     
                    </a>

                  </li>
                  <li>
                    <a
                      href=""
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     
                    </a>

                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Legal</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/term"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      TOS
                    </a>
                  </li>
                  <li>
                    <a
                      href="/ai-policy"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      AI Policy 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/privacy"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Privacy Policy 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     
                    </a>

                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">More</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/pro"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Pro
                    </a>
                  </li>
                  <li>
                    <a
                      href="/pricing"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Pricing 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/enterprise"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Enterprise 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">AI Research</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/ai"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                   AI 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/model"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Models
                    </a>
                  </li>
                  <li>
                    <a
                      href="/overview"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Overview 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                    
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                    
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                       
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">For</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="mailto:hi@runash.in"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Students 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/startups"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Startups 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/ambassadors"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     Ambassadors 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                     
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Tools</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      API
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Editor 
                    </a>
                  </li>
                  <li>
                    <a
                      href="/status"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      Status
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                  <li>
                    <a
                      href="/"
                      className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Copyright and Legal */}
          <div className="mt-12 pt-8 border-t border-orange-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} RunAsh AI. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <ThemeToggle />
              <div className="flex space-x-6">
                <a
                  href="/dashboard/chat"
                  className="text-gray-600  dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-sm"
                >
                  RunAsh Chat 
                <Badge varient="secondary" className="bg-green-600 text-white gap-2 space-x-1 dark:bg-green-500 animate-pulse text-xs">New</Badge>
                </a>
                <a
                  href="/help"
                  className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-sm"
                >
                  Help
                </a>
                <a
                  href="/support"
                  className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-sm"
                >
                  Support 
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
