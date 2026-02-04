export default function LoadingPage() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-8">
      <div className="h-48 w-full rounded-2xl bg-muted animate-pulse" />
      <div className="mt-6 space-y-4">
        <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
      </div>
      <div className="mt-8 space-y-3">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-11/12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-10/12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-9/12 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}
