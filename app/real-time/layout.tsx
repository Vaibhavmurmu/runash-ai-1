import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "RunAsh - Real-Time AI Video Generation",
  description:
    "Advanced real-time video generation powered by cutting-edge AI. Generate, stream, and collaborate with intelligent agents.",
  generator: "RunAsh.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RealTimeLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <section className="font-sans antialiased">
      {children}
      <Analytics />
    </section>
  )
}
