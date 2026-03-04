import Image from "next/image"

import { cn } from "@/lib/utils"

type FooterBrandProps = {
  className?: string
  labelClassName?: string
}

export function FooterBrand({ className, labelClassName }: FooterBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="RunAsh brand">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-orange-200/80 bg-white/95 p-1 shadow-sm dark:border-orange-500/30 dark:bg-slate-950/80">
        <Image src="/logo.png" alt="RunAsh logo" fill sizes="36px" className="object-contain" priority={false} />
      </div>
      <span className={cn("text-sm font-semibold tracking-tight text-foreground", labelClassName)}>RunAsh AI</span>
    </div>
  )
}

