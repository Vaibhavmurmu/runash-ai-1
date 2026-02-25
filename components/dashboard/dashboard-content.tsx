import type { ReactNode } from "react"

interface DashboardContentProps {
  children: ReactNode
  className?: string
}

export function DashboardContent({ children, className }: DashboardContentProps) {
  return <main className={className ?? "mx-auto flex w-full max-w-7xl flex-1 p-4 md:p-6"}>{children}</main>
}
