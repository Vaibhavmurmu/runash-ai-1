import React from "react";

import { Card } from "@/components/ui/card";

export function RecentProjectsSection({ children }: { children: React.ReactNode }) {
  return <Card className="border-zinc-800 bg-zinc-950 p-4">{children}</Card>;
}
