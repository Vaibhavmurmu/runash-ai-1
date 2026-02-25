import type { ReactNode } from "react"

interface DashboardContentProps {
  children: ReactNode
  className?: string
}

export function DashboardContent({ children, className }: DashboardContentProps) {
  return (
    <main
      className={
        className ??
        "mx-auto flex w-full max-w-[92rem] flex-1 px-4 pb-8 pt-5 sm:px-6 md:pt-6 lg:px-8 2xl:px-10"
      }
    >
      {children}
    </main>
  )
}
