import React from "react";

import { Card } from "@/components/ui/card";

export function PromptComposerSection({ children }: { children: React.ReactNode }) {
  return (
    <Card className="mx-auto mb-5 w-full max-w-4xl border-zinc-800 bg-zinc-950 p-0 sm:mb-6">
      {children}
    </Card>
  );
}
