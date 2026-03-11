import React from "react";

import { Card } from "@/components/ui/card";

type FeatureShellProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

export function FeatureShell({ title, description, children }: FeatureShellProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-950/60 p-3">
      <h3 className="text-sm font-medium text-zinc-100">{title}</h3>
      <p className="mt-1 text-xs text-zinc-400">{description}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </Card>
  );
}
