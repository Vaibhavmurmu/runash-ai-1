import type { ReactNode } from "react"

interface DashboardHeaderProps {
  heading: string
  text?: string
  className?: string
  children?: ReactNode
}

export function DashboardHeader({ heading, text, className, children }: DashboardHeaderProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          {text ? <p className="text-sm text-muted-foreground">{text}</p> : null}
        </div>
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  )
}
