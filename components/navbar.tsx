"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronDown, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ThemeSelector } from "@/components/theme-selector"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
      if (window.scrollY > 40) {
        setIsTemplatesOpen(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="group flex items-center gap-3" aria-label="RunAsh Home">
              <div className="relative h-9 w-9 overflow-hidden rounded-md border border-orange-200/70 bg-white shadow-sm dark:border-orange-900/40 dark:bg-gray-900">
                <Image
                  src="/logo.png"
                  alt="RunAsh logo"
                  fill
                  sizes="36px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
            
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-yellow-500 dark:from-orange-400 dark:to-yellow-300 text-transparent bg-clip-text">
                RunAsh
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFeaturesOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                Features <ChevronDown className="h-4 w-4" />
              </button>
              {isFeaturesOpen && (
                <div className="absolute left-0 top-10 w-[540px] rounded-xl border border-orange-100 bg-white p-4 shadow-2xl dark:border-orange-900/30 dark:bg-gray-900">
                  <div className="grid grid-cols-2 gap-4">
                    <Link href="/editor" className="group rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                      <div className="relative h-24 w-full overflow-hidden rounded-md">
                        <Image src="/runashchat.png" alt="Featured templates" fill className="object-cover" />
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Features</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">AI Curated features.</p>
                      </div>
                    </Link>
                    <div className="space-y-2 text-sm">
                      <Link href="/runashchat" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-300 dark:hover:bg-orange-900/20">RunAshChat</Link>
                      <Link href="/editor" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-300 dark:hover:bg-orange-900/20">AI Editor</Link>
                      <Link href="/studio" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-300 dark:hover:bg-orange-900/20">AI Studio</Link>
                      <Link href="/workflows" className="block rounded-md px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 dark:text-gray-300 dark:hover:bg-orange-900/20">AI Workflow</Link>
                      <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-orange-600 font-medium">Browse all <ArrowRight className="ml-1 h-4 w-4" />Dashboard</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link href="/pricing" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Docs
            </Link>
            <Link href="/realtime-live-vllm" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Real-time vLLM
            </Link>
            <Link href="/runash-llm" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              RunAsh LLM
            </Link>
            <Link href="/waitlist" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Waitlist
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <ThemeSelector />
            <Link href="/login">
              <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400">
                Log In
              </Button>
            </Link>
            <Link href="/get-started">
              <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white">
                Sign Up
              </Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center space-x-4">
            <ThemeSelector />
            <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-orange-100 dark:border-orange-900/20">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/editor" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">Templates</Link>
            <Link href="/pricing" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">Pricing</Link>
            <Link href="/docs" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">Documentation</Link>
            <Link href="/realtime-live-vllm" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">Real-time vLLM</Link>
            <Link href="/runash-llm" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">RunAsh LLM</Link>
            <Link href="/waitlist" className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md">Waitlist</Link>
          </div>
          <div className="px-5 py-4 border-t border-orange-100 dark:border-gray-800 flex flex-col space-y-3">
            <Link href="/login">
              <Button variant="ghost" className="justify-center text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400">
                Log In
              </Button>
            </Link>
            <Link href="/get-started">
              <Button className="justify-center bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
