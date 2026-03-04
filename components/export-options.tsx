import { Button } from "@/components/ui/button"

interface ExportOptionsProps {
  title: string
  formats: string[]
  periodOptions?: boolean
  additionalOptions?: string[]
}

export function ExportOptions({ title, formats, periodOptions = false, additionalOptions = [] }: ExportOptionsProps) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">Formats: {formats.join(", ")}</p>
      {periodOptions ? <p className="text-muted-foreground">Period filter supported</p> : null}
      {additionalOptions.length > 0 ? <p className="text-muted-foreground">Options: {additionalOptions.join(" · ")}</p> : null}
      <Button size="sm" className="bg-gradient-to-r from-orange-600 to-orange-400">Export</Button>
    </div>
  )
}
