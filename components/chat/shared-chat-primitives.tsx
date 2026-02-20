"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

export function ChatPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030405] text-zinc-100">
      <div className="mx-auto w-full max-w-[1280px] px-3 py-3 sm:px-4 sm:py-4">{children}</div>
    </div>
  );
}

export function ChatSurfaceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card className={`rounded-xl border-zinc-800 bg-[#050607] text-zinc-100 ${className}`}>{children}</Card>;
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
