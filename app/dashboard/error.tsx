"use client"

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">Dashboard is temporarily unavailable</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We couldn&apos;t load this dashboard view. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        Retry
      </button>
    </div>
  )
}
