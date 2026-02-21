"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import FeaturesSection from "@/components/features-section"
import DemoSection from "@/components/demo-section"
// import Footer from "@/components/footer"

export default function AIEditorPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-white text-foreground transition-colors duration-300">
      {/* <Header isDark={isDark} onToggleTheme={toggleTheme} /> */}
      <section className="min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-background to-background/50 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20"></div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 mb-6 w-fit bg-muted/50 px-3 py-1 rounded-full border border-border/50 hover:border-primary/30 transition-colors">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground/70">Powered by AI</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-balance leading-tight">
            Live Stream.
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Edit Anywhere
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-foreground/70 mb-8 text-balance max-w-xl leading-relaxed">
            Professional live streaming editor with AI-powered features. Generation, edit, remix, and stream your content in
            real-time from anywhere in the world.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground rounded-full text-base px-8"
            >
              Start Streaming
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full text-base px-8 border-border hover:bg-muted/50 bg-transparent"
            >
              Watch Demo
            </Button>
          </div>

          <div className="flex items-center gap-6 mt-12 pt-8 border-t border-border/30">
            <div>
              <p className="text-sm text-foreground/60">Trusted by creators</p>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full border border-border/50"
                  ></div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">1K+</p>
              <p className="text-sm text-foreground/60">Active creators</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          
        </div>
      </div>
    </section>
      
      <FeaturesSection />
      <DemoSection />
    {/*  <Footer /> */}
    </main>
  )
 }
