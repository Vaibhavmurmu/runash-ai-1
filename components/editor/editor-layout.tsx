import type React from "react"

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      {children}
    </div>
  )
}
