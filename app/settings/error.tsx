"use client"

interface SettingsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SettingsError({ reset }: SettingsErrorProps) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">Settings are temporarily unavailable</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We hit an issue while loading settings. Please try again.
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
