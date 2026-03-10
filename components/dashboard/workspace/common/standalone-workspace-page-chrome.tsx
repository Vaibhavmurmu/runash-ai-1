import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type WorkspaceChromeBreadcrumb = {
  label: string
  href?: string
}

export type WorkspaceChromeAction = {
  label: string
  href: string
  icon?: ReactNode
  ariaLabel?: string
}

export type WorkspaceChromeShortcutHint = {
  label: string
  keys: string[]
}

interface StandaloneWorkspacePageChromeProps {
  title: string
  description: string
  breadcrumbs: WorkspaceChromeBreadcrumb[]
  headerActions?: WorkspaceChromeAction[]
  keyboardShortcutHints?: WorkspaceChromeShortcutHint[]
  children: ReactNode
}

export function StandaloneWorkspacePageChrome({
  title,
  description,
  breadcrumbs,
  headerActions = [],
  keyboardShortcutHints = [],
  children,
}: StandaloneWorkspacePageChromeProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 p-4 md:space-y-5 md:p-6" data-workspace-page-chrome="standalone">
      <header className="space-y-3 rounded-xl border border-border/70 bg-card/50 p-4 shadow-sm">
        <nav aria-label="Workspace breadcrumbs" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
              {crumb.href ? (
                <Link className="hover:text-foreground focus-visible:text-foreground" href={crumb.href}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </span>
          ))}
        </nav>

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p>
          </div>

          {headerActions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2" aria-label="Workspace header actions">
              {headerActions.map((action) => (
                <Link
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  aria-label={action.ariaLabel ?? action.label}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
                >
                  {action.icon}
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {keyboardShortcutHints.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Keyboard shortcut hints">
            {keyboardShortcutHints.map((hint) => (
              <Badge key={hint.label} variant="outline" className="flex items-center gap-1.5 py-1">
                <span className="text-[11px] text-muted-foreground">{hint.label}</span>
                <span className="inline-flex items-center gap-1">
                  {hint.keys.map((key) => (
                    <kbd key={`${hint.label}-${key}`} className="rounded border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {key}
                    </kbd>
                  ))}
                </span>
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {children}
    </div>
  )
}
