import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, Info, ShieldAlert, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

const cardAlertVariants = cva("border-l-4", {
  variants: {
    severity: {
      info: "border-l-blue-500 bg-blue-50/60 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
      success: "border-l-green-500 bg-green-50/60 text-green-900 dark:bg-green-950/30 dark:text-green-100",
      warning: "border-l-amber-500 bg-amber-50/60 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
      danger: "border-l-red-500 bg-red-50/60 text-red-900 dark:bg-red-950/30 dark:text-red-100",
    },
  },
  defaultVariants: {
    severity: "info",
  },
})

const severityIconMap: Record<NonNullable<CardAlertProps["severity"]>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: ShieldAlert,
}

type CardAlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardAlertVariants> & {
    title: string
    description?: React.ReactNode
    icon?: LucideIcon
  }

const CardAlert = React.forwardRef<HTMLDivElement, CardAlertProps>(
  ({ className, title, description, severity = "info", icon: Icon, children, ...props }, ref) => {
    const SeverityIcon = Icon ?? severityIconMap[severity]

    return (
      <Card ref={ref} role="alert" aria-live="polite" className={cn(cardAlertVariants({ severity }), className)} {...props}>
        <CardContent className="flex items-start gap-3 p-4">
          <SeverityIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{title}</p>
            {description ? <div className="text-sm opacity-90">{description}</div> : null}
            {children ? <div className="text-sm opacity-90">{children}</div> : null}
          </div>
        </CardContent>
      </Card>
    )
  }
)

CardAlert.displayName = "CardAlert"

export { CardAlert, cardAlertVariants }
