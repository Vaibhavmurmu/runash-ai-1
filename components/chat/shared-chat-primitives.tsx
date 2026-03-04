"use client";

import type { ComponentProps, ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

export function ChatPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#030405] text-zinc-100">

      <div className="mx-auto w-full max-w-[1280px] px-3 py-3 sm:px-4 sm:py-4">{children}</div>

    </div>
  );
}

export function ChatSurfaceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card className={`rounded-xl border-zinc-800 bg-[#050607] text-zinc-100 ${className}`}>{children}</Card>;
}

export function ChatShellHeader({
  title,
  subtitle,
  icon,
  primaryAction,
  secondaryActions,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
}) {
  return (

    <header className="rounded-2xl border border-zinc-800/80 bg-zinc-950/95 p-2.5 backdrop-blur sm:p-3">
      <div className="flex min-w-0 flex-nowrap items-center justify-between gap-2 lg:gap-3">

    
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="rounded-lg bg-gradient-to-r from-orange-600 to-yellow-500 p-1.5 text-white sm:rounded-xl sm:p-2">{icon}</div>
          <div className="min-w-0">

            <h1 className="text-base font-semibold tracking-tight text-zinc-100 sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-zinc-400">{subtitle}</p>

            
          </div>
        </div>
        {primaryAction || secondaryActions ? (
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
            {primaryAction ? <div className="flex items-center">{primaryAction}</div> : null}
            {secondaryActions ? <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">{secondaryActions}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ChatInfoBanner({
  badge,
  message,
  cta,
  onCtaClick,
  onDismiss,
  ctaRef,
}: {
  badge: string;
  message: string;
  cta?: string;
  onCtaClick?: () => void;
  onDismiss?: () => void;
  ctaRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="relative rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-10 py-2.5 text-zinc-100 shadow-[0_10px_28px_-22px_rgba(34,211,238,0.55)] backdrop-blur-sm sm:px-12">
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs leading-relaxed sm:text-sm">
        <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-200">
          {badge}
        </span>
        <p className="text-zinc-200">{message}</p>
        {cta && onCtaClick ? (
          <Button
            ref={ctaRef}
            variant="link"
            className="h-auto p-0 text-xs font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200 sm:text-sm"
            onClick={onCtaClick}
          >
            {cta}
          </Button>
        ) : null}
      </div>
      {onDismiss ? (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={onDismiss}
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function ActionPill({ children, className = "", ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      variant={props.variant ?? "outline"}
      size={props.size ?? "sm"}
      className={`h-8 rounded-full border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-100 hover:bg-zinc-800 ${className}`}
    >
      {children}
    </Button>
  );
}

export function ChatDataState({
  state,
  loadingMessage,
  emptyMessage,
  errorMessage,
}: {
  state: "loading" | "empty" | "error";
  loadingMessage: string;
  emptyMessage: string;
  errorMessage: string;
}) {
  const message = state === "loading" ? loadingMessage : state === "error" ? errorMessage : emptyMessage;
  const tone = state === "error" ? "text-amber-300" : "text-zinc-500";

  return <p className={`rounded-md border border-zinc-800 bg-zinc-900/40 p-2 text-xs ${tone}`}>{message}</p>;
}

export type SuggestionCardItem = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  onAction: () => void;
  onDismiss?: () => void;
};

export function SuggestionCardGrid({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: SuggestionCardItem[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-4" aria-label={title}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      {items.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-zinc-200">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">{item.title}</h3>
                      <p className="mt-1 text-xs text-zinc-400">{item.description}</p>
                    </div>
                  </div>
                  {item.onDismiss ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      aria-label={`Dismiss ${item.title} suggestion`}
                      onClick={item.onDismiss}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 hover:bg-zinc-800"
                  onClick={item.onAction}
                >
                  {item.actionLabel}
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">{emptyMessage}</p>
      )}
    </section>
  );
}
