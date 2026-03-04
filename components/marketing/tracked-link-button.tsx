"use client"

import Link from "next/link"
import { track } from "@vercel/analytics"
import type React from "react"

import { Button } from "@/components/ui/button"

type TrackedLinkButtonProps = {
  href: string
  label: string
  eventName: string
  source: string
  external?: boolean
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  className?: string
  children: React.ReactNode
}

export default function TrackedLinkButton({
  href,
  label,
  eventName,
  source,
  external = false,
  variant = "default",
  className,
  children,
}: TrackedLinkButtonProps) {
  return (
    <Button
      asChild
      variant={variant}
      className={className}
      onClick={() => track(eventName, { label, href, source })}
    >
      <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
        {children}
      </Link>
    </Button>
  )
}
