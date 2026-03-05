import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Providers } from "@/components/providers"
import { Suspense } from "react"
import { CookieConsent } from "@/components/cookie-consent"


export const metadata: Metadata = {
  title: "RunAsh AI - Organic Products & Sustainable Living",
  description: "AI-powered assistant for organic products, sustainable living, recipes, and retail automation",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers>
            <Suspense fallback={null}>{children}</Suspense>
            {/* Cookie consent dialog */}
            <CookieConsent />
            <Toaster />
          </Providers>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
