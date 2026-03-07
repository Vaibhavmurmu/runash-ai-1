import React from "react";

export function TaskStarterSection({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="border-t border-zinc-800 px-3 py-4 sm:px-4"
      aria-label="Task starter onboarding"
    >
      {children}
    </section>
  );
}
