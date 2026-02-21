export function DashboardFooter() {
  return (
    <footer className="border-t bg-card/30 px-4 py-4 text-xs text-muted-foreground md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} RunAsh.AI. All rights reserved.</p>
        <p>Built for creators, operators, and AI-native teams.</p>
      </div>
    </footer>
  )
}
